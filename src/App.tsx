// src/App.tsx
import { useState } from "react";
import ConnectWallet from "./components/ConnectWallet";
import ChatRoom from "./components/ChatRoom";

function App() {
  const [privKey, setPrivKey] = useState("");
  const [pubKey, setPubKey] = useState("");

  return (
    <div>
      <ConnectWallet
        onKeys={(pKey: string, uKey: string) => {
          setPrivKey(pKey);
          setPubKey(uKey);
        }}
      />
      {privKey && pubKey && <ChatRoom privKey={privKey} pubKey={pubKey} />}
    </div>
  );
}

export default App;
