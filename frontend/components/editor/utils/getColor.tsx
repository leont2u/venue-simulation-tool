export default function getColor(type: string) {
  switch (type) {
    case "chair":
      return "#84A98C";
    case "podium":
      return "#7F5539";
    case "screen":
      return "#355070";
    case "camera":
      return "#457B9D";
    case "speaker":
      return "#BA7517";
    case "mixing_desk":
      return "#534AB7";
    case "banquet_table":
    case "desk":
      return "#D4A373";
    default:
      return "#9AA6B2";
  }
}
