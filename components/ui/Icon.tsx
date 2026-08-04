import type { SocialLink, StackItem } from "@/content/site";
import {
  FacebookIcon,
  GithubIcon,
  GoogleadsIcon,
  GoogleanalyticsIcon,
  GooglebigqueryIcon,
  GoogletagmanagerIcon,
  InstagramIcon,
  LinkedInIcon,
  LookerIcon,
  MetaIcon,
  ShopifyIcon,
  UpworkIcon,
  XIcon,
} from "@/components/ui/icons";

const SOCIAL = {
  upwork: UpworkIcon,
  linkedin: LinkedInIcon,
  x: XIcon,
  facebook: FacebookIcon,
  instagram: InstagramIcon,
  github: GithubIcon,
} as const;

const STACK = {
  googleanalytics: GoogleanalyticsIcon,
  googletagmanager: GoogletagmanagerIcon,
  meta: MetaIcon,
  googleads: GoogleadsIcon,
  googlebigquery: GooglebigqueryIcon,
  looker: LookerIcon,
  shopify: ShopifyIcon,
} as const;

export function SocialIcon({
  name,
  size = 17,
}: {
  name: SocialLink["icon"];
  size?: number;
}) {
  const Cmp = SOCIAL[name];
  return <Cmp size={size} />;
}

export function StackIcon({ item }: { item: StackItem }) {
  const Cmp = STACK[item.icon];
  return (
    <span style={{ color: item.fill, display: "block", flex: "0 0 auto" }}>
      <Cmp size={item.size} />
    </span>
  );
}
