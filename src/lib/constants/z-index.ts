export const Z_INDEX = {
  // Lowest layer for background elements, potentially behind base content
  BACKGROUND_UNDERLAY: -1,

  // Base layer for normal page content flow
  BASE: 0,
  
  // For elements that need to stack during interactions like dragging
  DRAGGING_ITEM: 20, 

  // Navigation/header elements, sidebars
  HEADER: 100, // Example value, adjust if needed
  SIDEBAR: 150, // Added for potential sidebars like the step editor one

  // Standard UI elements (dropdowns, tooltips)
  DROPDOWN: 500,
  TOOLTIP: 600,
  
  // Modal layer (most modals should use this)
  MODAL_OVERLAY: 999,
  MODAL: 1000,
  
  // Nested modal layers (for modals inside modals, like preview)
  NESTED_MODAL_OVERLAY: 1999,
  NESTED_MODAL: 2000,
  
  // Highest layer (toasts, notifications, critical alerts)
  TOAST: 10001,
  // Consider a higher one for RainbowKit/wallet connect if needed
  WALLET_CONNECT: 10100, 
}; 