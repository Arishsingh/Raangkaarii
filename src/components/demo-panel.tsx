"use client";

import * as React from "react";
import { motion } from "motion/react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function DemoPanel() {
  const [loading, setLoading] = React.useState(false);

  return (
    <Tabs defaultValue="components" className="gap-6">
      <TabsList>
        <TabsTrigger value="components">Components</TabsTrigger>
        <TabsTrigger value="motion">Motion</TabsTrigger>
        <TabsTrigger value="type">Type</TabsTrigger>
      </TabsList>

      <TabsContent value="components" className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Open dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Rename project</DialogTitle>
                <DialogDescription>
                  This is a plain shadcn Dialog — swap in AlertDialog for
                  destructive flows.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" defaultValue="client" />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="ghost">Cancel</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button onClick={() => toast.success("Project renamed")}>
                    Save
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">Open sheet</Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
                <SheetDescription>
                  Sheets work well for mobile navigation and filter panels.
                </SheetDescription>
              </SheetHeader>
            </SheetContent>
          </Sheet>

          <Button variant="secondary" onClick={() => toast("Event recorded")}>
            Fire toast
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Avatar className="h-9 w-9">
            <AvatarFallback>CL</AvatarFallback>
          </Avatar>
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <div className="flex items-center gap-2">
            <Switch
              id="loading"
              checked={loading}
              onCheckedChange={setLoading}
            />
            <Label htmlFor="loading">Loading state</Label>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Toggle the switch to preview skeleton placeholders.
          </p>
        )}
      </TabsContent>

      <TabsContent value="motion" className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Hover or press the tile — springs come from{" "}
          <code className="font-mono text-xs">motion/react</code>.
        </p>
        <motion.div
          whileHover={{ y: -4, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
          className="flex h-32 w-full max-w-xs cursor-pointer items-center justify-center rounded-xl border bg-card text-sm text-muted-foreground"
        >
          Interactive surface
        </motion.div>
      </TabsContent>

      <TabsContent value="type" className="flex flex-col gap-3">
        <p className="text-3xl font-semibold tracking-tight">Geist Sans</p>
        <p className="text-sm text-muted-foreground">
          Loaded through next/font — self-hosted, preloaded, no layout shift.
        </p>
        <p className="font-mono text-sm">
          Geist Mono · 0123456789 · const x = () =&gt; 42
        </p>
      </TabsContent>
    </Tabs>
  );
}
