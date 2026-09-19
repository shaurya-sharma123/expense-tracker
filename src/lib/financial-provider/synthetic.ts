import { BankAccount, RawExternalTransaction, Transaction, AllowedCategory } from "@/types";
import { FinancialDataProvider } from "./interface";

export class SyntheticFinancialDataProvider implements FinancialDataProvider {
  getProviderName(): string {
    return "Setu / Sahamati AA Synthetic Sandbox";
  }

  async getAccounts(userId: string): Promise<BankAccount[]> {
    return [
      {
        account_id: "acc_hdfc_freelance_01",
        account_name: "HDFC Freelancer Current A/C",
        bank_name: "HDFC Bank",
        account_type: "current",
        masked_account_number: "XXXX-XXXX-8912",
        balance: 48650.75,
        currency: "INR",
      },
      {
        account_id: "acc_icici_savings_02",
        account_name: "ICICI Personal Savings A/C",
        bank_name: "ICICI Bank",
        account_type: "savings",
        masked_account_number: "XXXX-XXXX-4421",
        balance: 14220.0,
        currency: "INR",
      },
    ];
  }

  async fetchTransactions(
    accountId: string,
    startDate?: string,
    endDate?: string
  ): Promise<RawExternalTransaction[]> {
    const rawData = this.generateSyntheticTransactions(accountId);
    if (!startDate && !endDate) return rawData;

    return rawData.filter((t) => {
      if (startDate && t.date < startDate) return false;
      if (endDate && t.date > endDate) return false;
      return true;
    });
  }

  normalizeTransaction(
    raw: RawExternalTransaction,
    userId: string = "demo-user-001"
  ): Omit<Transaction, "id" | "created_at" | "updated_at"> {
    const isIncome = raw.direction === "CR";
    const category = this.categorizeNarrative(raw.narrative, isIncome, raw.mode);

    return {
      user_id: userId,
      amount: Math.abs(raw.amount),
      type: isIncome ? "income" : "expense",
      category,
      description: raw.narrative,
      transaction_date: raw.date,
      source: "open_banking",
      merchant: raw.merchant_name || undefined,
      external_transaction_id: raw.txn_id,
      raw_data: {
        mode: raw.mode,
        direction: raw.direction,
        balance_after: raw.balance_after,
        raw_narrative: raw.narrative,
      },
    };
  }

  private categorizeNarrative(
    narrative: string,
    isIncome: boolean,
    mode: string
  ): AllowedCategory {
    const text = narrative.toLowerCase();

    if (mode === "ATM" || text.includes("atm wdl") || text.includes("cash wdl")) {
      return "Cash Withdrawal";
    }

    if (isIncome) {
      if (text.includes("salary") || text.includes("payroll")) return "Salary";
      if (text.includes("freelance") || text.includes("upwork") || text.includes("fiverr") || text.includes("client") || text.includes("web design") || text.includes("dev project")) return "Freelance";
      if (text.includes("vendor") || text.includes("shop sales") || text.includes("business") || text.includes("settlement") || text.includes("razorpay")) return "Business";
      return "Freelance"; // Default income for irregular worker
    }

    // Expenses
    if (text.includes("swiggy") || text.includes("zomato") || text.includes("canteen") || text.includes("food") || text.includes("tea") || text.includes("chai") || text.includes("restaurant")) return "Food";
    if (text.includes("uber") || text.includes("ola") || text.includes("metro") || text.includes("petrol") || text.includes("fuel") || text.includes("auto")) return "Transport";
    if (text.includes("rent") || text.includes("pg") || text.includes("landlord")) return "Rent";
    if (text.includes("bill") || text.includes("bescom") || text.includes("tneb") || text.includes("jio") || text.includes("airtel") || text.includes("broadband") || text.includes("recharge")) return "Bills";
    if (text.includes("amazon") || text.includes("flipkart") || text.includes("hardware") || text.includes("mart") || text.includes("store")) return "Shopping";
    if (text.includes("course") || text.includes("udemy") || text.includes("books") || text.includes("exam") || text.includes("training")) return "Education";
    if (text.includes("pharmacy") || text.includes("hospital") || text.includes("clinic") || text.includes("apollo") || text.includes("medplus")) return "Healthcare";

    return "Other";
  }

  private generateSyntheticTransactions(accountId: string): RawExternalTransaction[] {
    // 72 realistic transactions spanning 3 months for an irregular-earning tech & repair gig professional
    return [
      // Week 1 - June 2026
      { txn_id: "TXN_AA_1001", date: "2026-06-01", narrative: "NEFT/Part-Time Teaching Monthly Salary", amount: 15000, direction: "CR", mode: "NEFT", merchant_name: "Tech Academy" },
      { txn_id: "TXN_AA_1001B", date: "2026-06-02", narrative: "UPI/Merchant_9941_ScanAndPay", amount: 145, direction: "DR", mode: "UPI" },
      { txn_id: "TXN_AA_1002", date: "2026-06-03", narrative: "NEFT/Client Web Dev Milestone 1", amount: 18500, direction: "CR", mode: "NEFT", merchant_name: "Apex Studios" },
      { txn_id: "TXN_AA_1003", date: "2026-06-04", narrative: "UPI/Indian Oil Petrol Pump", amount: 500, direction: "DR", mode: "UPI", merchant_name: "Indian Oil" },
      { txn_id: "TXN_AA_1004", date: "2026-06-05", narrative: "IMPS/House Rent June", amount: 8500, direction: "DR", mode: "IMPS", merchant_name: "Suresh Landlord" },
      { txn_id: "TXN_AA_1005", date: "2026-06-07", narrative: "UPI/Chai Point & Snacks", amount: 95, direction: "DR", mode: "UPI", merchant_name: "Chai Point" },

      // Week 2 - June 2026
      { txn_id: "TXN_AA_1006", date: "2026-06-09", narrative: "UPI/Airtel Broadband Bill", amount: 999, direction: "DR", mode: "UPI", merchant_name: "Airtel" },
      { txn_id: "TXN_AA_1007", date: "2026-06-11", narrative: "UPI/Client Logo Design Payout", amount: 4500, direction: "CR", mode: "UPI", merchant_name: "Rohan Verma" },
      { txn_id: "TXN_AA_1007B", date: "2026-06-11", narrative: "UPI/Unknown Vendor POS 8812", amount: 210, direction: "DR", mode: "UPI" },
      { txn_id: "TXN_AA_1008", date: "2026-06-12", narrative: "ATM WDL/SBI ATM MG Road", amount: 3000, direction: "DR", mode: "ATM", merchant_name: "SBI ATM" },
      { txn_id: "TXN_AA_1009", date: "2026-06-13", narrative: "UPI/Amazon Marketplace Tools", amount: 1450, direction: "DR", mode: "UPI", merchant_name: "Amazon" },
      { txn_id: "TXN_AA_1010", date: "2026-06-14", narrative: "UPI/Zomato Dinner", amount: 380, direction: "DR", mode: "UPI", merchant_name: "Zomato" },

      // Week 3 - June 2026 (Low income week)
      { txn_id: "TXN_AA_1011", date: "2026-06-16", narrative: "UPI/Metro Smartcard Recharge", amount: 300, direction: "DR", mode: "UPI", merchant_name: "BMRCL Metro" },
      { txn_id: "TXN_AA_1012", date: "2026-06-18", narrative: "UPI/MedPlus Pharmacy", amount: 420, direction: "DR", mode: "UPI", merchant_name: "MedPlus" },
      { txn_id: "TXN_AA_1013", date: "2026-06-19", narrative: "UPI/Tea Stall", amount: 40, direction: "DR", mode: "UPI" },
      { txn_id: "TXN_AA_1014", date: "2026-06-21", narrative: "UPI/Local Grocery Store", amount: 1120, direction: "DR", mode: "UPI", merchant_name: "Reliance Fresh" },

      // Week 4 - June 2026 (Spike income week)
      { txn_id: "TXN_AA_1015", date: "2026-06-23", narrative: "IMPS/Mobile App Maintenance Retainer", amount: 24000, direction: "CR", mode: "IMPS", merchant_name: "Krypton Tech" },
      { txn_id: "TXN_AA_1016", date: "2026-06-24", narrative: "UPI/Client Quick Consultation", amount: 2500, direction: "CR", mode: "UPI", merchant_name: "Devika Rao" },
      { txn_id: "TXN_AA_1017", date: "2026-06-26", narrative: "UPI/BESCOM Electricity Bill", amount: 1340, direction: "DR", mode: "UPI", merchant_name: "BESCOM" },
      { txn_id: "TXN_AA_1018", date: "2026-06-28", narrative: "UPI/Uber Auto Ride", amount: 175, direction: "DR", mode: "UPI", merchant_name: "Uber" },

      // Week 5 - July 2026
      { txn_id: "TXN_AA_1019", date: "2026-07-02", narrative: "UPI/Swiggy Lunch Box", amount: 220, direction: "DR", mode: "UPI", merchant_name: "Swiggy" },
      { txn_id: "TXN_AA_1020", date: "2026-07-03", narrative: "IMPS/House Rent July", amount: 8500, direction: "DR", mode: "IMPS", merchant_name: "Suresh Landlord" },
      { txn_id: "TXN_AA_1021", date: "2026-07-04", narrative: "UPI/Hardware Electronics Repair Parts", amount: 2650, direction: "DR", mode: "UPI", merchant_name: "SP Road Electronics" },
      { txn_id: "TXN_AA_1022", date: "2026-07-05", narrative: "NEFT/Freelance Python Automation Project", amount: 31000, direction: "CR", mode: "NEFT", merchant_name: "FinPulse Labs" },
      { txn_id: "TXN_AA_1023", date: "2026-07-06", narrative: "ATM WDL/HDFC Bank ATM Indiranagar", amount: 4000, direction: "DR", mode: "ATM", merchant_name: "HDFC ATM" },

      // Week 6 - July 2026
      { txn_id: "TXN_AA_1024", date: "2026-07-08", narrative: "UPI/Udemy FullStack Next.js Course", amount: 799, direction: "DR", mode: "UPI", merchant_name: "Udemy" },
      { txn_id: "TXN_AA_1025", date: "2026-07-10", narrative: "UPI/Client Website Bug Fix Payout", amount: 3500, direction: "CR", mode: "UPI", merchant_name: "Karan Johar" },
      { txn_id: "TXN_AA_1026", date: "2026-07-12", narrative: "UPI/BPCL Petrol", amount: 650, direction: "DR", mode: "UPI", merchant_name: "BPCL" },
      { txn_id: "TXN_AA_1027", date: "2026-07-13", narrative: "UPI/Apollo Clinic Doctor Consultation", amount: 600, direction: "DR", mode: "UPI", merchant_name: "Apollo Clinic" },

      // Week 7 - July 2026 (Zero income week)
      { txn_id: "TXN_AA_1028", date: "2026-07-15", narrative: "UPI/Zomato Biryani Order", amount: 410, direction: "DR", mode: "UPI", merchant_name: "Zomato" },
      { txn_id: "TXN_AA_1029", date: "2026-07-17", narrative: "UPI/Tea and Bakery", amount: 130, direction: "DR", mode: "UPI" },
      { txn_id: "TXN_AA_1030", date: "2026-07-19", narrative: "UPI/Jio Prepaid Recharge", amount: 349, direction: "DR", mode: "UPI", merchant_name: "Reliance Jio" },
      { txn_id: "TXN_AA_1031", date: "2026-07-21", narrative: "UPI/Local Supermarket Provisions", amount: 1840, direction: "DR", mode: "UPI", merchant_name: "More Retail" },

      // Week 8 - July 2026
      { txn_id: "TXN_AA_1032", date: "2026-07-23", narrative: "UPI/Settlement Vendor Shop Sales", amount: 9200, direction: "CR", mode: "UPI", merchant_name: "Razorpay POS" },
      { txn_id: "TXN_AA_1033", date: "2026-07-25", narrative: "UPI/Swiggy Gourmet", amount: 560, direction: "DR", mode: "UPI", merchant_name: "Swiggy" },
      { txn_id: "TXN_AA_1034", date: "2026-07-27", narrative: "UPI/Ola Cabs City Travel", amount: 320, direction: "DR", mode: "UPI", merchant_name: "Ola" },
      { txn_id: "TXN_AA_1035", date: "2026-07-29", narrative: "NEFT/Small Business Retainer Client", amount: 15000, direction: "CR", mode: "NEFT", merchant_name: "SmartTech Solutions" },

      // Week 9 - August 2026
      { txn_id: "TXN_AA_1036", date: "2026-08-01", narrative: "IMPS/House Rent August", amount: 8500, direction: "DR", mode: "IMPS", merchant_name: "Suresh Landlord" },
      { txn_id: "TXN_AA_1037", date: "2026-08-02", narrative: "UPI/Airtel Fiber Broadband", amount: 999, direction: "DR", mode: "UPI", merchant_name: "Airtel" },
      { txn_id: "TXN_AA_1038", date: "2026-08-04", narrative: "UPI/Client Emergency Server Fix", amount: 7500, direction: "CR", mode: "UPI", merchant_name: "Vikram Mehta" },
      { txn_id: "TXN_AA_1039", date: "2026-08-05", narrative: "UPI/Indian Oil Fuel", amount: 600, direction: "DR", mode: "UPI", merchant_name: "Indian Oil" },
      { txn_id: "TXN_AA_1040", date: "2026-08-07", narrative: "ATM WDL/Canara Bank ATM", amount: 2000, direction: "DR", mode: "ATM", merchant_name: "Canara Bank" },

      // Week 10 - August 2026
      { txn_id: "TXN_AA_1041", date: "2026-08-09", narrative: "UPI/Swiggy Lunch", amount: 195, direction: "DR", mode: "UPI", merchant_name: "Swiggy" },
      { txn_id: "TXN_AA_1042", date: "2026-08-11", narrative: "UPI/Flipkart Cable & Adapters", amount: 899, direction: "DR", mode: "UPI", merchant_name: "Flipkart" },
      { txn_id: "TXN_AA_1043", date: "2026-08-13", narrative: "NEFT/Contract Dev Payout Milestone 2", amount: 22000, direction: "CR", mode: "NEFT", merchant_name: "Apex Studios" },
      { txn_id: "TXN_AA_1044", date: "2026-08-14", narrative: "UPI/BESCOM Electric Bill", amount: 1420, direction: "DR", mode: "UPI", merchant_name: "BESCOM" },

      // Week 11 - August 2026 (Low income week)
      { txn_id: "TXN_AA_1045", date: "2026-08-16", narrative: "UPI/Metro Card Recharge", amount: 400, direction: "DR", mode: "UPI", merchant_name: "BMRCL" },
      { txn_id: "TXN_AA_1046", date: "2026-08-18", narrative: "UPI/Chai & Snacks with Co-worker", amount: 110, direction: "DR", mode: "UPI" },
      { txn_id: "TXN_AA_1047", date: "2026-08-20", narrative: "UPI/Zomato Dinner", amount: 350, direction: "DR", mode: "UPI", merchant_name: "Zomato" },
      { txn_id: "TXN_AA_1048", date: "2026-08-22", narrative: "UPI/Client Small Consultation", amount: 1500, direction: "CR", mode: "UPI", merchant_name: "Pooja Sharma" },

      // Week 12 - August 2026
      { txn_id: "TXN_AA_1049", date: "2026-08-24", narrative: "UPI/Pharmacy Cough Syrup & Vitamins", amount: 380, direction: "DR", mode: "UPI", merchant_name: "MedPlus" },
      { txn_id: "TXN_AA_1050", date: "2026-08-26", narrative: "UPI/Client Mobile App UI Design", amount: 14000, direction: "CR", mode: "UPI", merchant_name: "CloudNine App" },
      { txn_id: "TXN_AA_1051", date: "2026-08-28", narrative: "UPI/Uber Auto Fare", amount: 160, direction: "DR", mode: "UPI", merchant_name: "Uber" },
      { txn_id: "TXN_AA_1052", date: "2026-08-30", narrative: "UPI/Supermarket Groceries", amount: 1620, direction: "DR", mode: "UPI", merchant_name: "D-Mart" },

      // Week 13 - September 2026
      { txn_id: "TXN_AA_1053", date: "2026-09-02", narrative: "IMPS/House Rent September", amount: 8500, direction: "DR", mode: "IMPS", merchant_name: "Suresh Landlord" },
      { txn_id: "TXN_AA_1054", date: "2026-09-03", narrative: "UPI/Airtel Broadband", amount: 999, direction: "DR", mode: "UPI", merchant_name: "Airtel" },
      { txn_id: "TXN_AA_1055", date: "2026-09-05", narrative: "UPI/Swiggy Express Meal", amount: 240, direction: "DR", mode: "UPI", merchant_name: "Swiggy" },
      { txn_id: "TXN_AA_1056", date: "2026-09-06", narrative: "NEFT/Enterprise Consulting Retainer", amount: 38000, direction: "CR", mode: "NEFT", merchant_name: "TechWave Inc" },
      { txn_id: "TXN_AA_1057", date: "2026-09-07", narrative: "ATM WDL/Axis Bank Indiranagar", amount: 5000, direction: "DR", mode: "ATM", merchant_name: "Axis Bank ATM" },

      // Week 14 - September 2026
      { txn_id: "TXN_AA_1058", date: "2026-09-09", narrative: "UPI/Indian Oil Fuel Fill", amount: 700, direction: "DR", mode: "UPI", merchant_name: "Indian Oil" },
      { txn_id: "TXN_AA_1059", date: "2026-09-11", narrative: "UPI/Certification Exam Fee", amount: 2100, direction: "DR", mode: "UPI", merchant_name: "AWS Certification" },
      { txn_id: "TXN_AA_1060", date: "2026-09-12", narrative: "UPI/Zomato Dinner", amount: 480, direction: "DR", mode: "UPI", merchant_name: "Zomato" },
      { txn_id: "TXN_AA_1061", date: "2026-09-13", narrative: "UPI/Local Hardware Electrical Parts", amount: 450, direction: "DR", mode: "UPI", merchant_name: "Balaji Hardware" },
      { txn_id: "TXN_AA_1062", date: "2026-09-15", narrative: "UPI/Freelance Bug Fix Bounty", amount: 6000, direction: "CR", mode: "UPI", merchant_name: "DevHub" },

      // Week 15 - Current Week September 2026
      { txn_id: "TXN_AA_1063", date: "2026-09-16", narrative: "UPI/Tea and Breakfast", amount: 85, direction: "DR", mode: "UPI" },
      { txn_id: "TXN_AA_1064", date: "2026-09-17", narrative: "UPI/Metro Smartcard Recharge", amount: 300, direction: "DR", mode: "UPI", merchant_name: "BMRCL" },
      { txn_id: "TXN_AA_1065", date: "2026-09-18", narrative: "UPI/Swiggy Lunch Combo", amount: 260, direction: "DR", mode: "UPI", merchant_name: "Swiggy" },
      { txn_id: "TXN_AA_1066", date: "2026-09-19", narrative: "UPI/Client Advance for WordPress Portal", amount: 10000, direction: "CR", mode: "UPI", merchant_name: "GreenEarth NGO" },
    ];
  }
}
