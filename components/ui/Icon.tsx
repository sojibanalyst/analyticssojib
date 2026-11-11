import type { SocialLink, StackItem, ToolIconName } from "@/content/site";
import {
  BigcommerceIcon,
  ClaudeIcon,
  FacebookIcon,
  GithubIcon,
  GoogleadsIcon,
  GoogleanalyticsIcon,
  GooglebigqueryIcon,
  GoogletagmanagerIcon,
  HotjarIcon,
  InstagramIcon,
  LinkedInIcon,
  LookerIcon,
  MagentoIcon,
  MetaIcon,
  MixpanelIcon,
  OpenaiIcon,
  PinterestIcon,
  RedditIcon,
  ShopifyIcon,
  SnapchatIcon,
  SquarespaceIcon,
  TiktokIcon,
  UpworkIcon,
  WebflowIcon,
  WhatsappIcon,
  WixIcon,
  WoocommerceIcon,
  WordpressIcon,
  XIcon,
} from "@/components/ui/icons";

const SOCIAL = {
  upwork: UpworkIcon,
  linkedin: LinkedInIcon,
  x: XIcon,
  facebook: FacebookIcon,
  instagram: InstagramIcon,
  github: GithubIcon,
  whatsapp: WhatsappIcon,
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
  /* Shared with the social row. One mark, one component — LinkedIn Ads is a
     tracking destination as well as a profile link. */
  linkedin: LinkedInIcon,
} as const;

/** The grouped tools section: the stack marks, plus the platforms only it lists. */
const TOOLS = {
  ...STACK,
  pinterest: PinterestIcon,
  hotjar: HotjarIcon,
  woocommerce: WoocommerceIcon,
  wordpress: WordpressIcon,
  wix: WixIcon,
  webflow: WebflowIcon,
  squarespace: SquarespaceIcon,
  bigcommerce: BigcommerceIcon,
  magento: MagentoIcon,
  mixpanel: MixpanelIcon,
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

/** A tool's official mark in the current text colour, for the grouped tools section. */
export function ToolIcon({ icon, size = 16 }: { icon: ToolIconName; size?: number }) {
  const Cmp = TOOLS[icon];
  return <Cmp size={size} />;
}
