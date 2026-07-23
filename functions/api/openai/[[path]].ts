type Context = { request: Request; params: { path?: string[] } };

const UPSTREAM_ORIGIN = "https://beeapi.ai";

export async function onRequest({ request, params }: Context) {
    const authorization = request.headers.get("authorization")?.trim();
    if (!authorization?.startsWith("Bearer ")) return Response.json({ error: { message: "请先填写 API Key" } }, { status: 401 });

    const path = (params.path || []).join("/").replace(/^\/+/, "");
    if (!path) return new Response("Not Found", { status: 404 });

    const target = new URL(`/${path}`, UPSTREAM_ORIGIN);
    target.search = new URL(request.url).search;

    const headers = new Headers(request.headers);
    ["content-length", "cookie", "host", "origin", "referer"].forEach((name) => headers.delete(name));

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
