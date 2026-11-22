// A template is created again on every page change (a layout is not), so the
// CSS animation of .page-transition (globals.css) plays each time the user
// goes to another tab. The header stays in place because it is in layout.js.
export default function Template({ children }) {
  return <div className="page-transition">{children}</div>;
}
