import type { SocialLink, StackItem } from "@/content/site";
import {
  ClaudeIcon,
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
  OpenaiIcon,
  RedditIcon,
  ShopifyIcon,
  SnapchatIcon,
  TiktokIcon,
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
  reddit: RedditIcon,
  tiktok: TiktokIcon,
  snapchat: SnapchatIcon,
  claude: ClaudeIcon,
  openai: OpenaiIcon,
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
  // The three marks the design flips per theme get a class instead of an
  // inline colour, so the strip can stay a server component.
  return (
    <span
      className={item.themed ? `stack-mark stack-mark--${item.themed}` : undefined}
      style={item.themed ? { display: "block", flex: "0 0 auto" } : { color: item.fill, display: "block", flex: "0 0 auto" }}
    >
      <Cmp size={item.size} />
    </span>
  );
}
