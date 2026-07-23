type Env = { BEE_API_KEY?: string };
type Context = { request: Request; env: Env; params: { path?: string[] } };

const UPSTREAM_ORIGIN = "https://beeapi.ai";

export async function onRequest({ request, env, params }: Context) {
    if (!env.BEE_API_KEY) return Response.json({ error: { message: "未配置 BEE_API_KEY" } }, { status: 500 });

    const path = (params.path || []).join("/").replace(/^\/+/, "");
    if (!path) return new Response("Not Found", { status: 404 });

    const target = new URL(`/${path}`, UPSTREAM_ORIGIN);
    target.search = new URL(request.url).search;

    const headers = new Headers(request.headers);
    ["authorization", "content-length", "cookie", "host", "origin", "referer"].forEach((name) => headers.delete(name));
    headers.set("authorization", `Bearer ${env.BEE_API_KEY}`);

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
