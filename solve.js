var rupiahRegex = /\d{1,3}(?:,\d{3})*(?:\.\d{2})/g;

var raw = `
0909/FTSCY/WS95031 8000.00 MUHAMMAD

0 G IQBAL RAM

Sep TRSFE-BANKING CR

2025 IDR 8,000.00

09 TGL: 0909 QR 912 00000.00GRAB TRANS
TRANSAKSI DEBIT

Sep

2025 |DR23,500.00
0909/FTSCY/WS9503112000.00 AFIF RULLY

0 9 SETYAWA

Sep TRSFE-BANKING CR

2025 IDR12,000.00

0) Oo TGL: 0909 QRC 014 00000.00ALFAMART R
TRANSAKSI DEBIT

Sep

2025 IDR 30,300.00
`;

var splitted_raw = raw.split(/\s+/);

var reports = []
var temp_reports = {"desc": "", "amount":0}

splitted_raw.forEach(token => {
  temp_reports["desc"] += token

  const matches = token.match(rupiahRegex) || [];
  if (matches.length > 0) {
    const clean = matches.map(m => {
      let val = m.replace(/,/g, "");       // remove thousand separators
      val = val.replace(/\.00$/, "");      // strip .00 at the end
      return parseInt(val, 10);            // convert to integer
    });
    console.log("RUPIAH", clean);
    temp_reports["amount"] = clean
    reports.push(temp_reports)
    temp_reports = {"desc":"","amount":0}
  }
});


console.table(reports)
