import { Links, Meta, LiveReload, Outlet, Scripts } from "@remix-run/react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { module } from "react/jsx-runtime";

const BASE_PATH = process?.env.BASE_PATH || "";

export function links() {
  return [
    { rel: "stylesheet", href: `${BASE_PATH}/assets/css/style-dts.css` }, // Dynamic base path
  ];
}

export default function App() {
  return (
    <>
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <Scripts />
      </body>
    </html>
    </>
  );
}

export async function loader({ request }: LoaderFunctionArgs) {

  return {  };
}