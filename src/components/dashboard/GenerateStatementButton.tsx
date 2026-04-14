"use client";
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { EndOfYearStatementPDF } from './EndOfYearStatementPDF';

// Dynamically import PDFDownloadLink with no SSR
const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then(mod => mod.PDFDownloadLink),
  { ssr: false, loading: () => <button className="btn btn-outline btn-sm" disabled>Loading PDF Engine...</button> }
);

interface GenerateStatementButtonProps {
  donor: {
    name: string;
    address: string;
    amount: string;
  };
  orgName: string;
  taxYear: string;
}

export default function GenerateStatementButton({ donor, orgName, taxYear }: GenerateStatementButtonProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return <button className="btn btn-outline btn-sm" disabled>Exporting...</button>;

  return (
    <PDFDownloadLink
      document={<EndOfYearStatementPDF donor={donor} orgName={orgName} taxYear={taxYear} />}
      fileName={`statement_${donor.name.replace(/\s+/g, '_')}_${taxYear}.pdf`}
    >
      {({ loading }) => (
        <button className="btn btn-outline btn-sm" disabled={loading}>
          {loading ? 'Generating PDF...' : '⬇ Export PDF'}
        </button>
      )}
    </PDFDownloadLink>
  );
}
