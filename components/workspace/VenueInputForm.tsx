"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormField } from "./FormField";
import { EnvironmentToggle } from "./EnvironmentToogle";
import { SliderWithInput } from "./SliderWithInput";

const venueTypes = [
  "Conference Hall",
  "Auditorium",
  "Stadium",
  "Arena",
  "Theater",
  "Exhibition Hall",
  "Banquet Hall",
];

const seatingStyles = [
  "Theatre",
  "Classroom",
  "Boardroom",
  "U-Shape",
  "Banquet",
  "Cocktail",
];

interface VenueFormData {
  description: string;
  venueType: string;
  environment: "indoor" | "outdoor";
  attendance: number;
  seatingStyle: string;
  stageRequired: boolean;
  avEquipment: string[];
  budgetRange: [number, number];
}

interface VenueInputFormProps {
  onGenerate?: (data: VenueFormData) => void;
  className?: string;
}

export function VenueInputForm({ onGenerate, className }: VenueInputFormProps) {
  const [formData, setFormData] = useState<VenueFormData>({
    description: "",
    venueType: "conference-hall",
    environment: "indoor",
    attendance: 100,
    seatingStyle: "theatre",
    stageRequired: true,
    avEquipment: [],
    budgetRange: [10000, 50000],
  });

  const updateField = <K extends keyof VenueFormData>(
    field: K,
    value: VenueFormData[K],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleGenerate = () => {
    onGenerate?.(formData);
  };

  return (
    <div className={className}>
      <div className="border-b px-6 py-4">
        <h2 className="text-lg font-semibold">Input Your Venue Concept</h2>
        <p className="text-sm text-muted-foreground">
          Describe your venue or import a sketch
        </p>
      </div>

      <div className="p-6">
        <Tabs defaultValue="text-prompt" className="w-full">
          <TabsList className="mb-6 w-full justify-start bg-transparent p-0">
            <TabsTrigger
              value="text-prompt"
              className="rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              Text Prompt
            </TabsTrigger>
            <TabsTrigger
              value="2d-sketch"
              className="rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              2D Sketch
            </TabsTrigger>
            <TabsTrigger
              value="template"
              className="rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              Template
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text-prompt" className="space-y-6">
            <FormField label="Describe your venue">
              <Textarea
                placeholder="Describe the venue setup you want to simulate... e.g., 'Indoor conference for 300 people with stage'"
                value={formData.description}
                onChange={(e) => updateField("description", e.target.value)}
                className="min-h-25 resize-none"
              />
            </FormField>

            <div className="flex justify-between ">
              <FormField label="Venue Type">
                <Select
                  value={formData.venueType}
                  onValueChange={(value) => updateField("venueType", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select venue type" />
                  </SelectTrigger>
                  <SelectContent>
                    {venueTypes.map((type) => (
                      <SelectItem
                        key={type.toLowerCase().replace(/\s/g, "-")}
                        value={type.toLowerCase().replace(/\s/g, "-")}
                      >
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Seating Style">
                <Select
                  value={formData.seatingStyle}
                  onValueChange={(value) => updateField("seatingStyle", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select seating style" />
                  </SelectTrigger>
                  <SelectContent>
                    {seatingStyles.map((style) => (
                      <SelectItem
                        key={style.toLowerCase().replace(/\s/g, "-")}
                        value={style.toLowerCase().replace(/\s/g, "-")}
                      >
                        {style}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            <FormField label="Environment" inline>
              <EnvironmentToggle
                value={formData.environment}
                onChange={(value) => updateField("environment", value)}
              />
            </FormField>

            <FormField label="Attendance">
              <SliderWithInput
                value={formData.attendance}
                onChange={(value) => updateField("attendance", value)}
                min={10}
                max={1000}
                step={10}
              />
            </FormField>

            <FormField label="Stage Required" inline>
              <Switch
                checked={formData.stageRequired}
                onCheckedChange={(checked) =>
                  updateField("stageRequired", checked)
                }
              />
            </FormField>

            <div className="space-y-3 pt-4">
              <Button
                onClick={handleGenerate}
                className="w-full bg-indigo-600 hover:bg-[#3b78e7]"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Generate 3D Layout
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="2d-sketch">
            <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed">
              <p className="text-sm text-muted-foreground">
                Upload or draw your 2D sketch here
              </p>
            </div>
          </TabsContent>

          <TabsContent value="template">
            <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed">
              <p className="text-sm text-muted-foreground">
                Browse and select from pre-made templates
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
