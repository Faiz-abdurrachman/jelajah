"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowRight, ArrowLeft, Check, Clock, DollarSign } from "lucide-react";

interface CampaignCreateProps {
  onCreated: () => void;
  onCancel: () => void;
}

interface CampaignForm {
  name: string;
  description: string;
  budget: string;
  startDate: string;
  endDate: string;
  locations: string;
}

const INITIAL_FORM: CampaignForm = {
  name: "",
  description: "",
  budget: "",
  startDate: "",
  endDate: "",
  locations: "",
};

const STEPS = [
  { label: "Details", icon: ArrowRight },
  { label: "Budget", icon: DollarSign },
  { label: "Schedule", icon: Clock },
  { label: "Review", icon: Check },
];

export function CampaignCreate({ onCreated, onCancel }: CampaignCreateProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<CampaignForm>(INITIAL_FORM);

  const updateField = (field: keyof CampaignForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const canNext = (): boolean => {
    switch (step) {
      case 0: return form.name.trim().length > 0 && form.description.trim().length > 0;
      case 1: return parseFloat(form.budget) > 0;
      case 2: return form.startDate.length > 0 && form.endDate.length > 0;
      default: return false;
    }
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSubmit = () => {
    onCreated();
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s.label} className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 text-sm ${
                  i <= step ? "text-primary font-medium" : "text-muted-foreground"
                }`}
              >
                <div
                  className={`size-6 rounded-full flex items-center justify-center text-xs ${
                    i < step
                      ? "bg-primary text-primary-foreground"
                      : i === step
                        ? "border-2 border-primary text-primary"
                        : "border-2 border-muted-foreground/30 text-muted-foreground"
                  }`}
                >
                  {i < step ? <Check className="size-3" /> : i + 1}
                </div>
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="w-4 h-px bg-muted-foreground/30 hidden sm:block" />
              )}
            </div>
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Campaign Details</h3>
            <Input placeholder="Campaign name" value={form.name} onChange={updateField("name")} />
            <Input
              placeholder="Campaign description"
              value={form.description}
              onChange={updateField("description")}
            />
            <Input
              placeholder="Hunt locations (comma-separated addresses)"
              value={form.locations}
              onChange={updateField("locations")}
            />
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Budget</h3>
            <Input
              type="number"
              placeholder="Total budget (XLM)"
              value={form.budget}
              onChange={updateField("budget")}
            />
            <p className="text-xs text-muted-foreground">
              This budget will be distributed across all hunts in this campaign.
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Schedule</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Start Date</label>
                <Input type="date" value={form.startDate} onChange={updateField("startDate")} />
              </div>
              <div>
                <label className="text-sm font-medium">End Date</label>
                <Input type="date" value={form.endDate} onChange={updateField("endDate")} />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Review Campaign</h3>
            <div className="space-y-2 bg-muted/50 rounded-lg p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{form.name || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Budget</span>
                <span className="font-medium">{form.budget ? `${form.budget} XLM` : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Period</span>
                <span className="font-medium">
                  {form.startDate && form.endDate
                    ? `${form.startDate} → ${form.endDate}`
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Locations</span>
                <span className="font-medium truncate max-w-40">{form.locations || "—"}</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between pt-4 border-t">
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="size-4 mr-2" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={handleNext} disabled={!canNext()}>
                Next
                <ArrowRight className="size-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit}>
                <Check className="size-4 mr-2" />
                Create Campaign
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
