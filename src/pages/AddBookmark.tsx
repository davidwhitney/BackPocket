import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Bookmark } from "../types/index";
import { useMetadataFetch } from "../hooks/useMetadataFetch";

interface Props {
  bookmarks: {
    addBookmark: (url: string, title?: string, description?: string) => Promise<Bookmark>;
  };
}

export function AddBookmark({ bookmarks }: Props) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const userEditedTitle = useRef(false);
  const userEditedDesc = useRef(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { fetching, fetchMeta, scheduleFetch, cancel } = useMetadataFetch((meta) => {
    if (!userEditedTitle.current && meta.title) setTitle(meta.title);
    if (!userEditedDesc.current && meta.description) setDescription(meta.description);
  });

  // Support /add?url=... from share target
  useEffect(() => {
    const sharedUrl = searchParams.get("url");
    const sharedTitle = searchParams.get("title");
    const sharedText = searchParams.get("text");

    if (sharedUrl) {
      setUrl(sharedUrl);
      if (sharedTitle) {
        setTitle(sharedTitle);
        userEditedTitle.current = true;
      }
      if (sharedText) {
        setDescription(sharedText);
        userEditedDesc.current = true;
      }

      if (sharedTitle) {
        handleSave(sharedUrl, sharedTitle, sharedText || undefined);
      } else {
        fetchMeta(sharedUrl);
      }
    }

    return cancel;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave(
    saveUrl?: string,
    saveTitle?: string,
    saveDesc?: string,
  ) {
    const finalUrl = saveUrl || url;
    if (!finalUrl.trim()) return;

    cancel();
    setSaving(true);
    try {
      const bookmark = await bookmarks.addBookmark(
        finalUrl.trim(),
        (saveTitle || title).trim() || undefined,
        (saveDesc || description).trim() || undefined,
      );
      navigate(`/view/${bookmark.id}`);
    } catch (err) {
      console.error("Failed to save:", err);
      setSaving(false);
    }
  }

  return (
    <div className="add-page">
      <h1>Add Bookmark</h1>
      <form
        className="add-form"
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
      >
        <div className="form-group">
          <label htmlFor="url">URL</label>
          <input
            id="url"
            type="url"
            placeholder="https://example.com/article"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              scheduleFetch(e.target.value);
            }}
            onPaste={(e) => {
              const pasted = e.clipboardData.getData("text");
              try {
                new URL(pasted);
                cancel();
                setTimeout(() => fetchMeta(pasted), 0);
              } catch {
                // Not a URL
              }
            }}
            required
            autoFocus
          />
        </div>
        <div className="form-group">
          <label htmlFor="title">
            Title
            {fetching && <span className="field-status"> — fetching...</span>}
          </label>
          <input
            id="title"
            type="text"
            placeholder={fetching ? "Fetching from page..." : "Page title"}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              userEditedTitle.current = true;
            }}
          />
        </div>
        <div className="form-group">
          <label htmlFor="desc">
            Description
            {fetching && !description && <span className="field-status"> — fetching...</span>}
          </label>
          <textarea
            id="desc"
            placeholder={fetching ? "Fetching from page..." : "Add a note..."}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              userEditedDesc.current = true;
            }}
            rows={3}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving || !url.trim()}>
          {saving ? "Saving..." : "Save Bookmark"}
        </button>
      </form>
    </div>
  );
}
