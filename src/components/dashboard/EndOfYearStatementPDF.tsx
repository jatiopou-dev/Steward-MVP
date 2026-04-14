"use client";
import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica' },
  header: { fontSize: 24, marginBottom: 5, color: '#111827' },
  subheader: { fontSize: 12, color: '#6B7280', marginBottom: 30 },
  detailsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  donorBox: { width: '50%' },
  donorName: { fontSize: 14, fontWeight: 'bold' },
  donorAddress: { fontSize: 10, color: '#374151', marginTop: 4 },
  churchBox: { width: '40%', alignItems: 'flex-end' },
  churchName: { fontSize: 12, fontWeight: 'bold' },
  table: { width: "100%", borderStyle: "solid", borderWidth: 1, borderColor: '#E5E7EB', borderRightWidth: 0, borderBottomWidth: 0, marginTop: 20 },
  tableRow: { flexDirection: "row" },
  tableHeaderCol: { width: "33.33%", backgroundColor: '#F3F4F6', borderStyle: "solid", borderColor: '#E5E7EB', borderWidth: 1, borderLeftWidth: 0, borderTopWidth: 0, padding: 5 },
  tableCol: { width: "33.33%", borderStyle: "solid", borderColor: '#E5E7EB', borderWidth: 1, borderLeftWidth: 0, borderTopWidth: 0, padding: 5 },
  tableCell: { fontSize: 10 },
  tableHeaderCell: { fontSize: 10, fontWeight: 'bold' },
  footer: { marginTop: 40, paddingTop: 20, borderTopWidth: 1, borderColor: '#E5E7EB' },
  footerText: { fontSize: 10, color: '#6B7280', textAlign: 'center' }
});

export const EndOfYearStatementPDF = ({ donor, orgName, taxYear }: any) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View>
        <Text style={styles.header}>Annual Statement of Giving</Text>
        <Text style={styles.subheader}>Tax Year: {taxYear}</Text>
      </View>
      
      <View style={styles.detailsRow}>
        <View style={styles.donorBox}>
          <Text style={styles.donorName}>{donor.name}</Text>
          <Text style={styles.donorAddress}>{donor.address}</Text>
        </View>
        <View style={styles.churchBox}>
          <Text style={styles.churchName}>{orgName}</Text>
          <Text style={styles.donorAddress}>Registered Charity No: 112233</Text>
        </View>
      </View>

      <Text style={{ fontSize: 11, marginBottom: 20 }}>
        Thank you for your financial support of {orgName}. Your generosity enables us to continue our mission. Below is a summary of your financial contributions for your records.
      </Text>
      
      <View style={styles.table}>
        <View style={styles.tableRow}>
          <View style={styles.tableHeaderCol}><Text style={styles.tableHeaderCell}>Giving Category</Text></View>
          <View style={styles.tableHeaderCol}><Text style={styles.tableHeaderCell}>Gift Aid Status</Text></View>
          <View style={styles.tableHeaderCol}><Text style={styles.tableHeaderCell}>Amount</Text></View>
        </View>
        <View style={styles.tableRow}>
          <View style={styles.tableCol}><Text style={styles.tableCell}>General Tithes & Offerings</Text></View>
          <View style={styles.tableCol}><Text style={styles.tableCell}>Eligible</Text></View>
          <View style={styles.tableCol}><Text style={styles.tableCell}>{donor.amount}</Text></View>
        </View>
      </View>
      
      <View style={{ marginTop: 20, alignItems: 'flex-end' }}>
        <Text style={{ fontSize: 12, fontWeight: 'bold' }}>Total Given: {donor.amount}</Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          No goods or services were provided in exchange for these contributions.
        </Text>
        <Text style={styles.footerText}>
          If you have any questions regarding this statement, please contact the church treasurer.
        </Text>
      </View>
    </Page>
  </Document>
);
