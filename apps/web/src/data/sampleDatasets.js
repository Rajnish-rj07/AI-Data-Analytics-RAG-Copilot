export const sampleDatasets = [
  {
    id: 'sample-ecommerce',
    title: 'E-Commerce Global Sales',
    description: '15 orders across tech categories with prices, profit margins, and return statuses.',
    filename: 'sample_ecommerce_sales.csv',
    tag: 'Retail & Sales',
    iconColor: 'from-blue-500 to-indigo-600',
    csv: `OrderID,Customer_Region,Category,Sub_Category,Quantity,Unit_Price,Total_Revenue,Profit_Margin,Return_Status,Rating
ORD-1001,North America,Technology,Laptops,2,1199.99,2399.98,0.22,No,4.8
ORD-1002,Europe,Electronics,Headphones,5,149.50,747.50,0.35,No,4.6
ORD-1003,Asia Pacific,Accessories,Keyboards,10,89.00,890.00,0.40,Yes,3.9
ORD-1004,North America,Technology,Smartphones,3,899.00,2697.00,0.18,No,4.9
ORD-1005,Latin America,Furniture,Desk Chairs,4,220.00,880.00,0.25,No,4.2
ORD-1006,Europe,Technology,Monitors,2,349.99,699.98,0.28,No,4.5
ORD-1007,Asia Pacific,Electronics,Smartwatches,6,199.00,1194.00,0.30,Yes,3.7
ORD-1008,North America,Furniture,Standing Desks,1,650.00,650.00,0.15,No,4.7
ORD-1009,Europe,Accessories,Mice,8,45.00,360.00,0.45,No,4.4
ORD-1010,North America,Technology,Tablets,4,520.00,2080.00,0.20,No,4.6
ORD-1011,Asia Pacific,Technology,Laptops,1,1450.00,1450.00,0.21,No,4.8
ORD-1012,Latin America,Electronics,Headphones,3,120.00,360.00,0.32,Yes,3.5
ORD-1013,Europe,Technology,Smartphones,2,999.00,1998.00,0.19,No,4.9
ORD-1014,North America,Accessories,Cables,15,18.50,277.50,0.50,No,4.3
ORD-1015,Asia Pacific,Furniture,Desk Chairs,2,240.00,480.00,0.24,No,4.1`,
  },
  {
    id: 'sample-churn',
    title: 'SaaS Customer Churn',
    description: 'Subscription data with monthly charges, contract types, tickets, and churn labels.',
    filename: 'sample_customer_churn.csv',
    tag: 'SaaS & Retention',
    iconColor: 'from-amber-500 to-orange-600',
    csv: `CustomerID,Plan_Tier,Tenure_Months,Monthly_Charges,Total_Spend,Contract_Type,Support_Tickets,Logins_Per_Month,Churned
CUST-001,Enterprise,24,199.00,4776.00,Two-Year,1,45,No
CUST-002,Starter,3,29.00,87.00,Month-to-Month,4,8,Yes
CUST-003,Professional,12,79.00,948.00,One-Year,2,28,No
CUST-004,Starter,6,29.00,174.00,Month-to-Month,5,11,Yes
CUST-005,Enterprise,36,249.00,8964.00,Two-Year,0,52,No
CUST-006,Professional,8,79.00,632.00,Month-to-Month,3,19,No
CUST-007,Starter,2,29.00,58.00,Month-to-Month,6,5,Yes
CUST-008,Enterprise,18,199.00,3582.00,One-Year,1,39,No
CUST-009,Professional,15,89.00,1335.00,One-Year,2,31,No
CUST-010,Starter,1,29.00,29.00,Month-to-Month,4,6,Yes
CUST-011,Professional,20,89.00,1780.00,Two-Year,1,34,No
CUST-012,Enterprise,48,299.00,14352.00,Two-Year,0,60,No
CUST-013,Starter,5,29.00,145.00,Month-to-Month,3,14,No
CUST-014,Professional,10,79.00,790.00,Month-to-Month,4,22,Yes
CUST-015,Enterprise,30,219.00,6570.00,Two-Year,1,48,No`,
  },
  {
    id: 'sample-workforce',
    title: 'Tech Workforce & Salary',
    description: 'Employee profiles with department, role, experience, salary, and performance.',
    filename: 'sample_tech_workforce.csv',
    tag: 'HR & People Ops',
    iconColor: 'from-emerald-500 to-teal-600',
    csv: `EmpID,Name,Department,Role,Experience_Years,Annual_Salary,Remote_Status,Performance_Score,Overtime
EMP-101,Alex Morgan,Engineering,Senior Backend Engineer,6,138000,Full Remote,4.8,No
EMP-102,Samantha Chen,Data Science,ML Engineer,4,125000,Hybrid,4.7,Yes
EMP-103,Marcus Bell,Product,Product Manager,5,118000,On-Site,4.5,No
EMP-104,Elena Rostova,Engineering,Frontend Lead,8,152000,Full Remote,4.9,No
EMP-105,David Kim,Marketing,Growth Marketer,3,78000,Hybrid,4.1,No
EMP-106,Aisha Patel,Data Science,Data Analyst,2,82000,Full Remote,4.6,No
EMP-107,James Wilson,Sales,Account Executive,4,95000,On-Site,4.3,Yes
EMP-108,Sophia Taylor,Engineering,DevOps Engineer,5,130000,Full Remote,4.8,No
EMP-109,Carlos Ortiz,Design,UX Designer,3,86000,Hybrid,4.4,No
EMP-110,Maya Lin,Product,Technical PM,7,142000,Full Remote,4.9,No
EMP-111,Lucas Silva,Sales,Sales Engineer,4,105000,Hybrid,4.2,Yes
EMP-112,Rachel Green,HR,People Operations Lead,6,98000,On-Site,4.6,No
EMP-113,Omar Farooq,Engineering,Security Engineer,5,135000,Full Remote,4.7,No
EMP-114,Hannah Abbott,Data Science,BI Developer,3,89000,Hybrid,4.4,No
EMP-115,Vikram Singh,Engineering,Staff Architect,12,185000,Full Remote,5.0,No`,
  },
]

export function createSampleFile(sample) {
  const blob = new Blob([sample.csv], { type: 'text/csv;charset=utf-8;' })
  return new File([blob], sample.filename, { type: 'text/csv' })
}
