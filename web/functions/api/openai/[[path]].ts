type Context = { request: Request; params: { path?: string[] } };

const UPSTREAM_HEADER = "x-site-proxy-upstream";

function apiBaseUrl(value: string) {
    const upstream = new URL(value);
    if (upstream.protocol !== "https:" && upstream.protocol !== "http:") throw new Error("invalid protocol");
    if (upstream.username || upstream.password) throw new Error("credentials are not supported");
    upstream.search = "";
    upstream.hash = "";
    const path = upstream.pathname.replace(/\/+$/, "");
    const lowerPath = path.toLowerCase();
    upstream.pathname = lowerPath.endsWith("/v1") || lowerPath.endsWith("/api/v3") || lowerPath.endsWith("/api/plan/v3") ? path || "/" : `${path}/v1`;
    return upstream;
}

export async function onRequest({ request, params }: Context) {
    const authorization = request.headers.get("authorization")?.trim();
    if (!authorization?.startsWith("Bearer ")) return Response.json({ error: { message: "请先填写 API Key" } }, { status: 401 });

    const path = (params.path || []).join("/").replace(/^\/+/, "");
    if (!path) return new Response("Not Found", { status: 404 });

    let upstream: URL;
    try {
        upstream = apiBaseUrl(request.headers.get(UPSTREAM_HEADER)?.trim() || "");
    } catch {
        return Response.json({ error: { message: "请填写有效的接口地址" } }, { status: 400 });
    }

    const target = new URL(path.replace(/^v1\/?/, ""), `${upstream.toString().replace(/\/+$/, "")}/`);
    if (target.origin !== upstream.origin) return Response.json({ error: { message: "接口地址无效" } }, { status: 400 });
    target.search = new URL(request.url).search;

    const headers = new Headers(request.headers);
    ["content-length", "cookie", "host", "origin", "referer", UPSTREAM_HEADER].forEach((name) => headers.delete(name));

    try {
        return await fetch(target, {
            method: request.method,
            headers,
            body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
            redirect: "manual",
        });
    } catch {
        return Response.json({ error: { message: "上游服务连接失败" } }, { status: 502 });
    }
}
