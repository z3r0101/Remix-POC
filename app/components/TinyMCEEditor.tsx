// app/components/TinyMCEEditor.tsx
import { Editor } from "@tinymce/tinymce-react";
import { useRef } from "react";

interface TinyMCEEditorProps {
  name: string;
  initialValue?: string;
  onEditorChange?: (content: string, editor: any) => void;
}

export default function TinyMCEEditor({
  name,
  initialValue,
  onEditorChange,
}: TinyMCEEditorProps) {
  const editorRef = useRef(null);

  return (
    <Editor
      apiKey="0yeztfs9cxpp34jtcjk94nmixjyfvg4ohm5dfp1336r9s021" // Optional: Add TinyMCE API key for premium features
      onInit={(evt, editor) => (editorRef.current = editor)}
      initialValue={initialValue}
      init={{
        height: 300,
        menubar: false,
        plugins: [
          "advlist autolink lists link image charmap print preview anchor",
          "searchreplace visualblocks code fullscreen",
          "insertdatetime media table paste code help wordcount",
        ],
        toolbar:
          "undo redo | formatselect | bold italic backcolor | \
          alignleft aligncenter alignright alignjustify | \
          bullist numlist outdent indent | removeformat | help",
        content_style:
          "body { font-family:Helvetica,Arial,sans-serif; font-size:14px }",
      }}
      textareaName={name}
      onEditorChange={onEditorChange}
    />
  );
}
