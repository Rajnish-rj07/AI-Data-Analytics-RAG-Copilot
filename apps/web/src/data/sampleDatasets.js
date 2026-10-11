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
  },
  {
    id: 'sample-quality-issues',
    title: 'E-Commerce with Data Quality Gaps',
    description: '18 sales records containing missing regions, missing ratings, and duplicates for testing cleaning & hygiene.',
    filename: 'sample_sales_with_issues.csv',
    tag: 'Data Quality & Cleaning',
    iconColor: 'from-amber-500 to-rose-600',
    csv: `Transaction_ID,Customer_Name,Region,Product_Category,Units_Sold,Unit_Price,Discount,Total_Sales,Customer_Rating
TXN-101,Alice Johnson,North,Electronics,2,450.00,0.05,855.00,4.8
TXN-102,Bob Smith,South,Home Appliances,1,120.00,0.00,120.00,4.2
TXN-103,Charlie Davis,East,Electronics,5,85.00,0.10,382.50,3.9
TXN-104,Diana Evans,,Furniture,3,210.00,0.15,535.50,4.5
TXN-105,Evan Wright,West,Office Supplies,12,15.00,0.00,180.00,4.1
TXN-106,Fiona Gallagher,North,Electronics,1,1200.00,0.05,1140.00,
TXN-107,George Clark,South,Home Appliances,4,95.00,0.00,380.00,4.0
TXN-108,Hannah Abbott,West,Office Supplies,,25.00,0.05,,3.8
TXN-103,Charlie Davis,East,Electronics,5,85.00,0.10,382.50,3.9
TXN-109,Ian Malcolm,East,Electronics,2,600.00,0.10,1080.00,4.7
TXN-110,Julia Roberts,North,Furniture,2,350.00,0.00,700.00,4.6
TXN-111,Kevin Bacon,South,Electronics,45,450.00,0.20,16200.00,4.9
TXN-112,Laura Croft,West,Home Appliances,2,180.00,,360.00,4.3
TXN-113,Michael Scott,North,Office Supplies,8,12.50,0.00,100.00,3.5
TXN-103,Charlie Davis,East,Electronics,5,85.00,0.10,382.50,3.9
TXN-114,Nina Simone,East,Furniture,1,850.00,0.05,807.50,4.9
TXN-115,Oscar Isaac,South,Office Supplies,10,8.00,0.00,80.00,4.0`,
  },
]

export function createSampleFile(sample) {
  const blob = new Blob([sample.csv], { type: 'text/csv;charset=utf-8;' })
  return new File([blob], sample.filename, { type: 'text/csv' })
}
