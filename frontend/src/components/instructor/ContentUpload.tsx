import { Upload, File, Play, BookOpen, Link as LinkIcon, Code } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCourseBuilder } from "@/hooks/useCourseBuilder";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ContentUploadProps {
  onContentAdded?: (contentData: any) => void;
}

const CONTENT_TYPES = [
  { value: "video", label: "Video", icon: Play },
  { value: "pdf", label: "PDF", icon: File },
  { value: "notes", label: "Notes", icon: BookOpen },
  { value: "link", label: "Link", icon: LinkIcon },
  { value: "code", label: "Code", icon: Code },
];

export function ContentUpload({ onContentAdded }: ContentUploadProps) {
  const { modules, selectedNodeId, selectedNodeType, selectNode } =
    useCourseBuilder();
  const [contentType, setContentType] = useState("video");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [duration, setDuration] = useState(0);
  const [tags, setTags] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Get available nodes for selection
  const getAvailableNodes = () => {
    const nodes: Array<{
      id: string;
      label: string;
      type: "module" | "topic" | "subtopic";
    }> = [];

    modules.forEach((module) => {
      nodes.push({
        id: module._id || `module-${modules.indexOf(module)}`,
        label: `Module: ${module.title}`,
        type: "module",
      });

      module.topics.forEach((topic) => {
        nodes.push({
          id: topic._id || `topic-${module.topics.indexOf(topic)}`,
          label: `  ↳ Topic: ${topic.title}`,
          type: "topic",
        });

        topic.subtopics?.forEach((subtopic) => {
          nodes.push({
            id: subtopic._id || `subtopic-${topic.subtopics?.indexOf(subtopic)}`,
            label: `    ↳ Subtopic: ${subtopic.title}`,
            type: "subtopic",
          });
        });
      });
    });

    return nodes;
  };

  const handleUpload = async () => {
    if (!selectedNodeId || !title || !url) {
      alert("Please fill all fields and select a node");
      return;
    }

    setIsUploading(true);

    try {
      // Prepare content data
      const contentData = {
        title,
        type: contentType,
        url,
        duration,
        tags: tags.split(",").map((t) => t.trim()),
        nodeId: selectedNodeId,
        nodeType: selectedNodeType,
      };

      // TODO: Call API to upload
      // const response = await fetch("/api/content/upload", { ... })

      // Simulate upload delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      onContentAdded?.(contentData);

      // Reset form
      setTitle("");
      setUrl("");
      setDuration(0);
      setTags("");
      setContentType("video");

      alert("Content added successfully!");
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload content");
    } finally {
      setIsUploading(false);
    }
  };

  const availableNodes = getAvailableNodes();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <Card className="p-5">
        <div className="mb-4">
          <h3 className="text-base font-semibold">Upload Content</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Add videos, PDFs, notes, or links to your course nodes
          </p>
        </div>

        <div className="space-y-4">
          {/* Node Selection */}
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Target Node *
            </label>
            <Select
              value={selectedNodeId || ""}
              onValueChange={(value) => {
                const node = availableNodes.find((n) => n.id === value);
                if (node) {
                  selectNode(node.id, node.type);
                }
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue
                  placeholder={
                    selectedNodeId
                      ? `Selected: ${selectedNodeType}`
                      : "Select a node..."
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {availableNodes.map((node) => (
                  <SelectItem key={node.id} value={node.id}>
                    {node.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Content Type */}
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Content Type *
            </label>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {CONTENT_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    onClick={() => setContentType(type.value)}
                    className={`flex flex-col items-center gap-1 rounded-lg border-2 p-3 transition-all ${
                      contentType === type.value
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-border/80"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs font-medium">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Title *
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1"
              placeholder="Content title"
            />
          </div>

          {/* URL/File */}
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              {contentType === "link" ? "URL" : "File URL"} *
            </label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="mt-1"
              placeholder={
                contentType === "link"
                  ? "https://example.com"
                  : "Cloudinary or hosted URL"
              }
            />
          </div>

          {/* Duration (for videos) */}
          {contentType === "video" && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Duration (seconds)
              </label>
              <Input
                type="number"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                className="mt-1"
                min="0"
                placeholder="Video duration in seconds"
              />
            </div>
          )}

          {/* Tags */}
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Tags (comma-separated)
            </label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="mt-1"
              placeholder="e.g., introduction, important, quiz-prep"
            />
          </div>

          {/* Submit */}
          <Button
            onClick={handleUpload}
            disabled={isUploading || !selectedNodeId}
            className="w-full"
          >
            <Upload className="mr-2 h-4 w-4" />
            {isUploading ? "Uploading..." : "Add Content"}
          </Button>
        </div>
      </Card>

      {/* Selected Node Info */}
      {selectedNodeId && (
        <Card className="border-primary/50 bg-primary/5 p-4">
          <p className="text-sm">
            <span className="font-medium">Selected Node Type:</span>{" "}
            <span className="capitalize">{selectedNodeType}</span>
          </p>
        </Card>
      )}
    </motion.div>
  );
}
