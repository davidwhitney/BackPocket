export async function shareUrl(title: string, url: string): Promise<void> {
  if (navigator.share) {
    try {
      await navigator.share({ title, url });
    } catch {
      // User cancelled
    }
  } else {
    await navigator.clipboard.writeText(url);
  }
}
