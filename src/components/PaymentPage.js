import upiLink from "../assets/payment.png";

export default function PaymentPage() {

  return (
    <div className="flex flex-col items-center justify-center bg-black text-white p-2">
      <h2 className="text-3xl font-bold mb-4">UPI Payment</h2>
      <h3>Please pay Rs. 300/- and attach screenshot in the form.</h3><br /><br />
      <img
        src={upiLink}
        className="w-48 h-48 object-contain"
        alt="UPI QR"
      />
    </div>
  );
}
