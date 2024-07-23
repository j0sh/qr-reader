import { useState, useCallback, useEffect, ReactElement, FC as ReactFC }  from 'react';
import { useDropzone } from 'react-dropzone';
import { Html5Qrcode } from 'html5-qrcode';
import { URI as OTPAuthURI } from 'otpauth';
import { decodeMigrationPayload } from './otp-migration/otp-migration'
import { base32Encode } from './base32'

import ClipboardIcon from './ClipboardIcon';

function isValidURL(s:string){
  try {
    new URL(s);
    return true;
  } catch(_) {
    return false;
  }
}

function decodeOTPAuthMigration(s:string){
  // google authenticator URL export
  const url = new URL(s);
  const data = url.searchParams.get('data');
  if (!data) throw new Error("Invalid base64 data");
  const buffer = Uint8Array.from(atob(data.replace(' ', '+')), c => c.charCodeAt(0));
  const m = decodeMigrationPayload(buffer);
  return m.otp_parameters?.map(e => {
    return {...e, secret:base32Encode(e.secret || new Uint8Array())}
  })
}

function copyClip(msg:string){
  return function(){
    navigator.clipboard.writeText(msg);
  };
}

const QRCodeReader: ReactFC = () => {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [decodedText, setDecodedText] = useState<string | ReactElement[] | null>(null);
  const [totpCode, setTotpCode] = useState<string | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);


  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    const reader = new FileReader();
    setIsProcessing(true);
    reader.onload = () => {
      const imageData = reader.result as string;
      setImageSrc(imageData);
    };
    reader.readAsDataURL(file);

    // Create a new instance of Html5Qrcode
    const html5QrCode = new Html5Qrcode("reader");

    // Decode QR Code from the image
    html5QrCode.scanFile(file, true).then(qrCodeMessage => {
      // Handle the decoded QR code message
      const m = isValidURL(qrCodeMessage) ? <a key="msg2" href={qrCodeMessage}>{qrCodeMessage}</a> : <span key="msg2">{qrCodeMessage}</span>;
      setDecodedText([<span key="msg1">Decoded Text: </span>,<ClipboardIcon onClick={copyClip(qrCodeMessage)} key="copy-icon"/>,m]);
      setTotpCode(null);
      setIsProcessing(false);

      // Check if the QR code is a TOTP URL
      if (qrCodeMessage.startsWith('otpauth://')) {
        try {
          // Parse the OTP URL
          const otp = OTPAuthURI.parse(qrCodeMessage);
          // Generate the TOTP token
          const token = otp.generate();
          setTotpCode(token);
        } catch (error) {
          console.error('Error generating TOTP code:', error);
          setDecodedText("Invalid OTP code: "+qrCodeMessage);
        }
      }
      if (qrCodeMessage.startsWith('otpauth-migration://offline')) {
        try {
          const m = decodeOTPAuthMigration(qrCodeMessage);
          setDecodedText(JSON.stringify(m));
        } catch (error) {
          console.error('Error decoding otpauth migration:', error, qrCodeMessage);
          setDecodedText("Unable to decode otpauth migration: "+qrCodeMessage);
        }
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    }).catch(_err => {
      // Handle error
      setDecodedText('No QR code found.');
      setIsProcessing(false);
      setTotpCode(null);
    });

  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });
  useEffect(() => {
    const pasteHandler = (ev : ClipboardEvent) => {
      ev.preventDefault();
      const clipboardData = ev.clipboardData;
      if (!clipboardData) return;

      const items = clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (!blob) continue;
          onDrop([blob])
          break;
        }
      }
    };
    window.addEventListener('paste', pasteHandler);
    return () => {
      window.removeEventListener('paste', pasteHandler);
    };
  }, [onDrop])


  return (
    <div>
      <div {...getRootProps()} className="bg-sky-50 rounded border border-sky-600 p-4 text-center cursor-pointer">
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop the QR code here ...</p>
        ) : !isProcessing ? (
          <p>Paste or drag 'n' drop a QR code here, or click to select a file</p>
        ) : (
          <p>Processing...</p>
        )}
      </div>
      <div className="text-start flex flex-col gap-2 mt-4">
        {imageSrc && <img src={imageSrc} alt="QR Code" className="max-w-[250px]" />}
        {decodedText && <p>{decodedText}</p>}
        {totpCode && <p>Current TOTP Code: <ClipboardIcon onClick={copyClip(totpCode)}/> {totpCode}</p>}
      </div>
      <div id="reader" style={{ display: 'none' }}></div>
    </div>
  );
};

export default QRCodeReader;
