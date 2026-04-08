"use client";
import React, { useState } from "react";

export default function CheckoutButton({ 
  plan, 
  amount, 
  className, 
  children 
}: { 
  plan: string; 
  amount: number; 
  className: string; 
  children: React.ReactNode; 
}) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, amount })
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error(data.error);
        alert(data.error || "Checkout failed");
        setLoading(false);
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  return (
    <button 
      className={className} 
      onClick={handleCheckout}
      disabled={loading}
      style={{ display: "block", textAlign: "center", width: "100%", opacity: loading ? 0.7 : 1 }}
    >
      {loading ? "Redirecting..." : children}
    </button>
  );
}
