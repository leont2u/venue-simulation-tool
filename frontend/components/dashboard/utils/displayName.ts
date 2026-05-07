export default function displayName(email?: string) {
  if (!email) return "Founder";
  const name = email.split("@")[0]?.replace(/[._-]+/g, " ");
  return name
    ? name
        .split(" ")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
    : "Founder";
}
