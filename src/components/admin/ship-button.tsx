"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Truck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

/**
 * Books a Delhivery parcel for one order.
 *
 * The waybill is the courier's own identifier, so once it exists the order is
 * shipped as far as this panel is concerned — the button is replaced by it.
 */
export function ShipButton({
  orderId,
  waybill,
  shippable,
}: {
  orderId: string;
  waybill: string | null;
  /** False when the order predates address capture and cannot be booked. */
  shippable: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  if (waybill) {
    return (
      <a
        href={`https://www.delhivery.com/track/package/${encodeURIComponent(waybill)}`}
        target="_blank"
        rel="noreferrer"
        className="font-mono text-xs underline underline-offset-4"
      >
        {waybill}
      </a>
    );
  }

  if (!shippable) {
    return <span className="text-xs text-muted-foreground">No address</span>;
  }

  const book = async () => {
    setPending(true);
    try {
      const response = await fetch("/api/admin/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error ?? "Could not book the shipment.");
        return;
      }

      toast.success(
        data.alreadyBooked
          ? `Already booked as ${data.waybill}.`
          : `Booked. Waybill ${data.waybill}.`,
      );
      router.refresh();
    } catch {
      toast.error("Could not reach the server.");
    } finally {
      setPending(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={book} disabled={pending}>
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Truck />}
      Ship
    </Button>
  );
}
