import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type Variant = "primary" | "secondary";

type Common = { variant?: Variant; children: ReactNode; className?: string };

type AsLink = Common & { href: string } & Omit<ComponentPropsWithoutRef<"a">, "href" | "className">;
type AsButton = Common & { href?: undefined } & Omit<ComponentPropsWithoutRef<"button">, "className">;

const VARIANT_CLASS: Record<Variant, string> = {
  primary: "btn btn-primary",
  secondary: "btn btn-ghost",
};

/**
 * The site's two buttons.
 *
 *   primary    the signal green as a fill, dark text, a soft glow on hover
 *   secondary  an outline
 *
 * With `href` it renders a link, without it a <button>. An in-site path goes
 * through next/link; anything else is a plain anchor, and an absolute URL
 * opens in a new tab with `rel="noopener"`.
 *
 * The classes are the existing .btn rules in app/components.css, so anything
 * still written as <a className="btn btn-primary"> looks identical.
 */
export function Button(props: AsLink | AsButton) {
  const { variant = "primary", className, children, ...rest } = props;
  const cls = [VARIANT_CLASS[variant], className].filter(Boolean).join(" ");

  if (typeof props.href === "string") {
    const { href, ...anchor } = rest as Omit<AsLink, keyof Common>;
    if (href.startsWith("/")) {
      return (
        <Link href={href} className={cls} {...anchor}>
          {children}
        </Link>
      );
    }
    const external = /^https?:\/\//.test(href);
    return (
      <a
        href={href}
        className={cls}
        {...(external ? { target: "_blank", rel: "noopener" } : {})}
        {...anchor}
      >
        {children}
      </a>
    );
  }

  const { type = "button", ...button } = rest as Omit<AsButton, keyof Common>;
  return (
    <button type={type} className={cls} {...button}>
      {children}
    </button>
  );
}
