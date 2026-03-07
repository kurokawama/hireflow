"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { FileText, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { createCampaign, deleteCampaign, getCampaigns } from "@/lib/actions/quiz-campaigns";
import type { QuizCampaign } from "@/types/quiz";
import type { CreateCampaignRequest } from "@/types/quiz-dto";

interface QuizCampaignPanelProps {
  selectedId: string | null;
  onSelectCampaign: (id: string | null) => void;
}

type CampaignForm = Pick<CreateCampaignRequest, "name" | "slug" | "brand"> & {
  description: string;
};

const INITIAL_FORM: CampaignForm = {
  name: "",
  slug: "",
  brand: "dr_stretch",
  description: "",
};

export function QuizCampaignPanel({ selectedId, onSelectCampaign }: QuizCampaignPanelProps) {
  const [campaigns, setCampaigns] = useState<QuizCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<CampaignForm>(INITIAL_FORM);
  const [error, setError] = useState("");

  const loadCampaigns = async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await getCampaigns();
      setCampaigns(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load campaigns.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadCampaigns();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const created = await createCampaign({
        name: form.name,
        slug: form.slug,
        brand: form.brand,
        description: form.description || undefined,
        is_active: true,
      });
      setForm(INITIAL_FORM);
      setIsDialogOpen(false);
      await loadCampaigns();
      onSelectCampaign(created.id);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to create campaign.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (campaignId: string) => {
    setError("");
    try {
      await deleteCampaign(campaignId);
      await loadCampaigns();
      if (selectedId === campaignId) {
        onSelectCampaign(null);
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete campaign.");
    }
  };

  return (
    <Card className="rounded-md border border-neutral-200 bg-white">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-4">
        <CardTitle className="text-neutral-900">Campaign</CardTitle>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setForm(INITIAL_FORM);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-[#1D3557] text-white hover:bg-[#122540]">
              <Plus className="mr-2 h-4 w-4" />
              新規キャンペーン
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[560px]">
            <DialogHeader>
              <DialogTitle>新規キャンペーン</DialogTitle>
            </DialogHeader>
            <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
              <div className="space-y-2">
                <Label htmlFor="campaign-name">name</Label>
                <Input
                  id="campaign-name"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="campaign-slug">slug</Label>
                <Input
                  id="campaign-slug"
                  value={form.slug}
                  onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="campaign-brand">brand</Label>
                <Select
                  value={form.brand}
                  onValueChange={(value: QuizCampaign["brand"]) =>
                    setForm((prev) => ({ ...prev, brand: value }))
                  }
                >
                  <SelectTrigger id="campaign-brand">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dr_stretch">dr_stretch</SelectItem>
                    <SelectItem value="wecle">wecle</SelectItem>
                    <SelectItem value="hq">hq</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="campaign-description">description</Label>
                <Textarea
                  id="campaign-description"
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#1D3557] text-white hover:bg-[#122540]"
              >
                {isSubmitting ? "Submitting..." : "新規キャンペーン"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}

        {isLoading ? (
          <div className="animate-pulse rounded-md bg-neutral-100 h-8" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-neutral-200">
                <TableHead>name</TableHead>
                <TableHead>slug</TableHead>
                <TableHead>brand</TableHead>
                <TableHead className="w-[220px]">action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow
                  key={campaign.id}
                  className={selectedId === campaign.id ? "bg-neutral-50" : ""}
                  onClick={() => onSelectCampaign(campaign.id)}
                >
                  <TableCell className="font-medium text-neutral-900">{campaign.name}</TableCell>
                  <TableCell className="text-neutral-600">{campaign.slug}</TableCell>
                  <TableCell className="text-neutral-600">{campaign.brand}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/settings/quiz/${campaign.id}`}
                        className="inline-flex items-center text-sm text-[#1D3557] hover:text-[#14253d]"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <FileText className="mr-1 h-4 w-4" />
                        質問管理→
                      </Link>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-neutral-200"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleDelete(campaign.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-[#E63946]" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {campaigns.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-neutral-500">
                    データなし
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
