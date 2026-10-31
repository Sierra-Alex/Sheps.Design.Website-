// Components.d.ts — the complete catalog of the 3 component(s) in
// Components.bundle.js. READ THIS FILE BEFORE USING THE BUNDLE: component
// names are derived from Figma layer names (sanitized to PascalCase,
// deduplicated) and may differ from what the design calls them — the
// "figma layer" comment above each interface maps them back.
// After the bundle <script> loads, every component is a window global
// (e.g. window.CustomerLogo) and usable directly in JSX.
import * as React from 'react';

// figma layer: "customer-logo" (node 3309:2646)
export interface CustomerLogoProps {
  className?: string;
  style?: React.CSSProperties;
  brand?: "Fortune 100 Best" | "Frame 7002" | "Nasdaq" | "Shift" | "Skyscanner" | "Starz" | "Travel Republic" | "US Bank" | "ab-tasty" | "allente" | "ancestry" | "atb" | "axon" | "bernie" | "bettermint" | "bettermint-color" | "bilyoner" | "blackbaud" | "boll-and-branch" | "bolt" | "brightside" | "buzzfeed" | "clorox" | "clorox-dark" | "codespark-academy" | "comarch" | "dashthis" | "deliveroo" | "docusign" | "domain" | "duda" | "easypark" | "empower" | "empower-dark" | "expedia" | "faceit" | "faceit-dark" | "fortune100best" | "gbm" | "geko" | "godaddy" | "grabr" | "gtxcel" | "guidebook" | "hinge" | "hinge 1" | "honeybook" | "immobiliare" | "intigral" | "kaplan" | "kast" | "khata" | "khatabook" | "kkday" | "kommunicate" | "krispy-kreme" | "lemonade" | "madpaws" | "may" | "misterbandb" | "mmhmm" | "monday.com" | "monday.com-white" | "neftlix" | "okcredit" | "onelaunch" | "paidy" | "passion-factory" | "passion-factory-dark" | "patient-ping" | "pendo" | "pendo 1" | "pixum" | "pixum-dark" | "qatar-movies" | "quicken" | "rakuten-viber" | "resy" | "shift" | "signeasy" | "skyscanner" | "sport-heroes" | "stocard" | "studocu" | "sunrun" | "support-bee" | "support-bee-dark" | "thoughtspot" | "ticketmaster" | "travel-republic" | "tvs-logo" | "tvs_logo" | "tvspielefilm" | "twitch" | "us-bank" | "wilco" | "yelp" | "yummly" | "yummly 1" | "ziprecruiter";
  color?: "color" | "dark" | "white";
  /** Text content; defaults to "OkCredit". */
  text1?: string;
  /** Text content; defaults to "Simple. Paperless. Secure". */
  text2?: string;
}

// figma layer: "grid-system" (node 3400:3388)
export interface GridSystemProps {
  className?: string;
  style?: React.CSSProperties;
}

// figma layer: "MXP - Main Logo" (node 3309:683)
export interface MXPMainLogoProps {
  className?: string;
  style?: React.CSSProperties;
  color?: "black" | "white" | "purple";
}

declare const CustomerLogo: React.FC<CustomerLogoProps>;
declare const GridSystem: React.FC<GridSystemProps>;
declare const MXPMainLogo: React.FC<MXPMainLogoProps>;
declare global {
  interface Window {
    CustomerLogo: React.FC<CustomerLogoProps>;
    GridSystem: React.FC<GridSystemProps>;
    MXPMainLogo: React.FC<MXPMainLogoProps>;
  }
}
