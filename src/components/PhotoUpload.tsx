import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X, Loader2, User } from "lucide-react";
import { toast } from "sonner";

interface PhotoUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  bucket?: string;
  folder?: string;
  size?: "sm" | "md" | "lg";
}

export function PhotoUpload({
  value,
  onChange,
  label = "Photo",
  bucket = "photos",
  folder = "uploads",
  size = "md",
}: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);
  const inputRef = useRef<HTMLInputElement>(null);

  const sizeClass = {
    sm: "h-16 w-16",
    md: "h-24 w-24",
    lg: "h-32 w-32",
  }[size];

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB");
      return;
    }

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      // Try to upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { upsert: true, contentType: file.type });

      if (error) {
        // If bucket doesn't exist or RLS error, use base64 fallback
        if (
          error.message?.includes("not found") ||
          error.message?.includes("Bucket") ||
          (error as any).statusCode === 404
        ) {
          // Fallback: store as base64 data URL (works without storage bucket)
          const reader2 = new FileReader();
          reader2.onload = (e) => {
            const dataUrl = e.target?.result as string;
            onChange(dataUrl);
            toast.success("Photo saved");
          };
          reader2.readAsDataURL(file);
          return;
        }
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
      onChange(urlData.publicUrl);
      toast.success("Photo uploaded");
    } catch (err: any) {
      // Final fallback: use base64
      const reader3 = new FileReader();
      reader3.onload = (e) => {
        const dataUrl = e.target?.result as string;
        onChange(dataUrl);
        setPreview(dataUrl);
        toast.success("Photo saved locally");
      };
      reader3.readAsDataURL(file);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <div className="flex items-center gap-4">
        {/* Preview circle */}
        <div
          className={`${sizeClass} rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center overflow-hidden bg-muted/30 shrink-0 cursor-pointer hover:border-primary/50 transition-colors`}
          onClick={() => !uploading && inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : preview ? (
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-cover"
              onError={() => setPreview(null)}
            />
          ) : (
            <div className="flex flex-col items-center gap-1 text-muted-foreground">
              <User className="h-6 w-6" />
              <span className="text-[10px]">Add Photo</span>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Uploading...</>
            ) : (
              <><Upload className="h-3.5 w-3.5 mr-1.5" />{preview ? "Change Photo" : "Upload Photo"}</>
            )}
          </Button>
          {preview && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-destructive"
              onClick={handleRemove}
            >
              <X className="h-3.5 w-3.5 mr-1.5" />Remove
            </Button>
          )}
          <p className="text-[10px] text-muted-foreground">Max 5MB · JPG, PNG, WebP</p>
        </div>

        {/* Hidden input */}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>
    </div>
  );
}
