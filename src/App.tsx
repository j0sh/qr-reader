import QRCodeReader from './QRCodeReader';

function App() {
  return (
    <div className="m-8 flex flex-col align-center gap-4 text-center">
      <h1 className="text-4xl">QR Code Reader</h1>
      <div>
        <p>All processing is done locally. Data never leaves your device.</p>
        <p>Special processing for TOTP codes and Google Authenticator OTP exports</p>
      </div>
      <QRCodeReader />
      <p>By <a href="https://transfix.ai">Transfix</a> in San Diego 🌴</p>
    </div>
  );
}

export default App;
