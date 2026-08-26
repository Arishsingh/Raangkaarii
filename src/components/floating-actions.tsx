"use client";

import { motion } from "motion/react";

import { ChatWidget } from "@/components/chat-widget";

const WHATSAPP_NUMBER = "918716000023";
const INSTAGRAM_URL =
  "https://www.instagram.com/rangkaarii_jammu?igsi=MXI2M3FzeHc5emRtag%3D%3D&utm_source=qr";

/* Brand marks are inline SVG: lucide dropped its social icon set in v1. */
const INSTAGRAM_PATH =
  "M12 2.16c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85C2.38 3.92 3.89 2.38 7.15 2.23 8.42 2.17 8.8 2.16 12 2.16zM12 0C8.74 0 8.33.01 7.05.07 2.7.27.28 2.69.08 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.2 4.36 2.62 6.78 6.98 6.98C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c4.35-.2 6.78-2.62 6.98-6.98.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.2-4.35-2.62-6.78-6.98-6.98C15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 100 12.32 6.16 6.16 0 000-12.32zm0 10.16a4 4 0 110-8 4 4 0 010 8zm6.4-11.85a1.44 1.44 0 100 2.88 1.44 1.44 0 000-2.88z";
const WHATSAPP_PATH =
  "M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.75-1.65-2.05-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.06 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.28.17-1.41-.07-.13-.27-.2-.57-.35zM12.05 21.8h-.01a9.87 9.87 0 01-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 01-1.51-5.26c0-5.45 4.44-9.88 9.9-9.88a9.82 9.82 0 016.99 2.9 9.82 9.82 0 012.89 6.99c0 5.45-4.44 9.88-9.89 9.88zM20.5 3.49A11.82 11.82 0 0012.05 0C5.5 0 .17 5.33.17 11.88c0 2.09.55 4.14 1.59 5.94L.07 24l6.33-1.66a11.85 11.85 0 005.65 1.44h.01c6.55 0 11.88-5.33 11.88-11.88a11.8 11.8 0 00-3.44-8.41z";

/**
 * Entry animation is CSS (tw-animate-css) so the controls are painted on the
 * server render; motion only handles the interaction springs.
 */
export function FloatingActions() {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-3">
      <ChatWidget />

      <motion.a
        href={INSTAGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Rangkaarii on Instagram"
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        className="flex size-12 animate-in items-center justify-center rounded-full bg-gradient-to-br from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white shadow-lg fade-in zoom-in-95 fill-mode-both duration-500 delay-700"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="size-5">
          <path d={INSTAGRAM_PATH} />
        </svg>
      </motion.a>

      <motion.a
        href={`https://wa.me/${WHATSAPP_NUMBER}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on WhatsApp"
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        className="flex size-12 animate-in items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg fade-in zoom-in-95 fill-mode-both duration-500 delay-[850ms]"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="size-6">
          <path d={WHATSAPP_PATH} />
        </svg>
      </motion.a>
    </div>
  );
}
