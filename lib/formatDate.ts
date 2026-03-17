export default function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toISOString().split("T")[0];
}
