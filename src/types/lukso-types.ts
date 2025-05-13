/**
 * Represents the verification part of an asset or image URL in LSP3/LSP4 metadata.
 */
export interface LSP3Verification {
  method: string; // e.g., "keccak256(bytes)"
  data: string;   // e.g., "0x<hash_of_the_asset_bytes>"
}

/**
 * Represents a single image object (for profileImage, backgroundImage) in LSP3 metadata.
 */
export interface LSP3Image {
  width?: number;
  height?: number;
  url: string; // Can be an ipfs:// URI or an https:// URL
  verification?: LSP3Verification;
}

/**
 * Represents a link object in LSP3 metadata.
 */
export interface LSP3Link {
  title: string;
  url: string;
}

/**
 * Represents the main LSP3Profile data structure.
 */
export interface LSP3Profile {
  name?: string | null;
  description?: string | null;
  profileImage?: LSP3Image[] | null;
  backgroundImage?: LSP3Image[] | null;
  tags?: string[] | null;
  links?: LSP3Link[] | null;
}

/**
 * Represents the root structure of the JSON file pointed to by the LSP3Profile data key.
 */
export interface LSP3ProfileMetadataJSON {
  LSP3Profile: LSP3Profile;
}

/**
 * Represents the decoded object for a VerifiableURI value content from erc725.js getData.
 */
export interface VerifiableURIObject {
  hashFunction?: string; 
  hash?: string; // This is the content hash
  url: string; // This is the URI (e.g., ipfs://...)
} 