import './App.css'
import Pages from "./index.jsx"
// We now import from the NEW file name
import { Toaster } from "./MyToast"

function App() {
  return (
    <>
      <Pages />
      <Toaster />
    </>
  )
}

export default App


