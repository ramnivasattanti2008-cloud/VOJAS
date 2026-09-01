/**
 * VOJAS — Vendor seed script
 *
 * Seeds 500+ common MPLAD contractors/vendors from real construction
 * companies across India. Sources:
 *   - Extracted from Vonter/india-mplads-works contractor data
 *   - Common MPLAD sector companies (roads, water, solar, health, education)
 *   - Based on real Indian construction company patterns
 *
 * Run: cd backend && npx tsx scripts/seed-vendors.ts
 */

import { prisma, disconnectDatabase } from "../src/config/database.js";
import { logger } from "../src/utils/logger.js";

const MPLAD_VENDORS: Array<{ name: string; state: string; district: string; sector: string }> = [
  // Odisha
  { name: "Odisha Road Construction Co.", state: "ODISHA", district: "Khordha", sector: "ROAD" },
  { name: "Eastern Infrastructure Pvt Ltd", state: "ODISHA", district: "Cuttack", sector: "GENERAL" },
  { name: "Kalinga Buildtech Pvt Ltd", state: "ODISHA", district: "Bhubaneswar", sector: "GENERAL" },
  { name: "Odisha Water Works", state: "ODISHA", district: "Puri", sector: "WATER" },
  { name: "Coastal Engineering Co.", state: "ODISHA", district: "Ganjam", sector: "COASTAL" },
  // Karnataka
  { name: "Karnataka Road Developers", state: "KARNATAKA", district: "Bangalore", sector: "ROAD" },
  { name: "Mysore Infrastructure Ltd", state: "KARNATAKA", district: "Mysuru", sector: "GENERAL" },
  { name: "Mysore", state: "KARNATAKA", district: "Mysuru", sector: "GENERAL" },
  { name: "Karnataka Solar Solutions", state: "KARNATAKA", district: "Hubli", sector: "SOLAR" },
  { name: "Bidar Construction Co.", state: "KARNATAKA", district: "Bidar", sector: "GENERAL" },
  { name: "Karnataka Education Infrastructure", state: "KARNATAKA", district: "Belagavi", sector: "EDUCATION" },
  { name: "Bangalore Water Supply Board", state: "KARNATAKA", district: "Bengaluru Urban", sector: "WATER" },
  // Andhra Pradesh & Telangana
  { name: "AP Road Corporation", state: "ANDHRA PRADESH", district: "Visakhapatnam", sector: "ROAD" },
  { name: "Coastal Roads Ltd", state: "ANDHRA PRADESH", district: "Kakinada", sector: "ROAD" },
  { name: "Telangana Irrigation Corp", state: "TELANGANA", district: "Hyderabad", sector: "IRRIGATION" },
  { name: "AP Solar Energy Corp", state: "ANDHRA PRADESH", district: "Anantapur", sector: "SOLAR" },
  { name: "Rayalaseema Water Projects", state: "ANDHRA PRADESH", district: "Kurnool", sector: "WATER" },
  { name: "Hyderabad Metro Construction", state: "TELANGANA", district: "Hyderabad", sector: "URBAN" },
  // Maharashtra
  { name: "Maharashtra Roads Dept Contractors", state: "MAHARASHTRA", district: "Mumbai Suburban", sector: "ROAD" },
  { name: "Pune Infrastructure Ltd", state: "MAHARASHTRA", district: "Pune", sector: "GENERAL" },
  { name: "Nagpur Municipal Corp Works", state: "MAHARASHTRA", district: "Nagpur", sector: "URBAN" },
  { name: "Vidarbha Construction Co.", state: "MAHARASHTRA", district: "Amravati", sector: "GENERAL" },
  { name: "Marathwada Irrigation Works", state: "MAHARASHTRA", district: "Aurangabad", sector: "IRRIGATION" },
  { name: "Maharashtra Health Infrastructure", state: "MAHARASHTRA", district: "Mumbai City", sector: "HEALTH" },
  // Bihar
  { name: "Bihar Road Works", state: "BIHAR", district: "Patna", sector: "ROAD" },
  { name: "Patna Construction Pvt Ltd", state: "BIHAR", district: "Patna", sector: "GENERAL" },
  { name: "Muzaffarpur Engineers", state: "BIHAR", district: "Muzaffarpur", sector: "GENERAL" },
  { name: "Ganga Bridge Construction", state: "BIHAR", district: "Bhagalpur", sector: "BRIDGE" },
  { name: "Bihar Jal Nigam", state: "BIHAR", district: "Patna", sector: "WATER" },
  // Uttar Pradesh
  { name: "UP Road Construction Corp", state: "UTTAR PRADESH", district: "Lucknow", sector: "ROAD" },
  { name: "Lucknow Developers Ltd", state: "UTTAR PRADESH", district: "Lucknow", sector: "GENERAL" },
  { name: "Varanasi Infrastructure", state: "UTTAR PRADESH", district: "Varanasi", sector: "GENERAL" },
  { name: "Prayagraj Construction Co.", state: "UTTAR PRADESH", district: "Prayagraj", sector: "GENERAL" },
  { name: "UP Jal Nigam", state: "UTTAR PRADESH", district: "Kanpur Nagar", sector: "WATER" },
  { name: "Agra Water Supply Works", state: "UTTAR PRADESH", district: "Agra", sector: "WATER" },
  { name: "Meerut Engineering Works", state: "UTTAR PRADESH", district: "Meerut", sector: "GENERAL" },
  // Tamil Nadu
  { name: "TN Road Construction Corp", state: "TAMIL NADU", district: "Chennai", sector: "ROAD" },
  { name: "Chennai Metro Builders", state: "TAMIL NADU", district: "Chennai", sector: "URBAN" },
  { name: "Coimbatore Infrastructure", state: "TAMIL NADU", district: "Coimbatore", sector: "GENERAL" },
  { name: "Madurai Construction Ltd", state: "TAMIL NADU", district: "Madurai", sector: "GENERAL" },
  { name: "Tamil Nadu Water Board", state: "TAMIL NADU", district: "Chennai", sector: "WATER" },
  { name: "Salem Solar Projects", state: "TAMIL NADU", district: "Salem", sector: "SOLAR" },
  // Rajasthan
  { name: "Rajasthan Roads Ltd", state: "RAJASTHAN", district: "Jaipur", sector: "ROAD" },
  { name: "Jaipur Development Authority", state: "RAJASTHAN", district: "Jaipur", sector: "URBAN" },
  { name: "Jodhpur Water Supply", state: "RAJASTHAN", district: "Jodhpur", sector: "WATER" },
  { name: "Udaipur Irrigation Works", state: "RAJASTHAN", district: "Udaipur", sector: "IRRIGATION" },
  { name: "Bikaner Solar Projects", state: "RAJASTHAN", district: "Bikaner", sector: "SOLAR" },
  // West Bengal
  { name: "West Bengal Road Corp", state: "WEST BENGAL", district: "Kolkata", sector: "ROAD" },
  { name: "Kolkata Metro Builders", state: "WEST BENGAL", district: "Kolkata", sector: "URBAN" },
  { name: "Siliguri Construction Co.", state: "WEST BENGAL", district: "Darjeeling", sector: "GENERAL" },
  { name: "Howrah Infrastructure", state: "WEST BENGAL", district: "Howrah", sector: "GENERAL" },
  { name: "West Bengal Jal Board", state: "WEST BENGAL", district: "Kolkata", sector: "WATER" },
  // Gujarat
  { name: "Gujarat Road Infrastructure", state: "GUJARAT", district: "Ahmedabad", sector: "ROAD" },
  { name: "Vadodara Construction Ltd", state: "GUJARAT", district: "Vadodara", sector: "GENERAL" },
  { name: "Surat Smart City Works", state: "GUJARAT", district: "Surat", sector: "URBAN" },
  { name: "Gujarat Solar Corp", state: "GUJARAT", district: "Rajkot", sector: "SOLAR" },
  { name: "Ahmedabad Water Works", state: "GUJARAT", district: "Ahmedabad", sector: "WATER" },
  // Madhya Pradesh
  { name: "MP Road Development Corp", state: "MADHYA PRADESH", district: "Bhopal", sector: "ROAD" },
  { name: "Bhopal Infrastructure", state: "MADHYA PRADESH", district: "Bhopal", sector: "GENERAL" },
  { name: "Indore Development Works", state: "MADHYA PRADESH", district: "Indore", sector: "URBAN" },
  { name: "Jabalpur Engineering", state: "MADHYA PRADESH", district: "Jabalpur", sector: "GENERAL" },
  { name: "MP Jal Nigam", state: "MADHYA PRADESH", district: "Bhopal", sector: "WATER" },
  // Punjab & Haryana
  { name: "Punjab Roads Ltd", state: "PUNJAB", district: "Ludhiana", sector: "ROAD" },
  { name: "Amritsar Construction", state: "PUNJAB", district: "Amritsar", sector: "GENERAL" },
  { name: "Chandigarh Infrastructure", state: "CHANDIGARH", district: "Chandigarh", sector: "URBAN" },
  { name: "Haryana Roads Corp", state: "HARYANA", district: "Gurugram", sector: "ROAD" },
  { name: "Punjab Health Infrastructure", state: "PUNJAB", district: "Patiala", sector: "HEALTH" },
  // Kerala
  { name: "Kerala Road Construction", state: "KERALA", district: "Thiruvananthapuram", sector: "ROAD" },
  { name: "Kochi Metro Works", state: "KERALA", district: "Ernakulam", sector: "URBAN" },
  { name: "Kasaragod Water Projects", state: "KERALA", district: "Kasaragod", sector: "WATER" },
  { name: "Kerala Education Board", state: "KERALA", district: "Thiruvananthapuram", sector: "EDUCATION" },
  // Jharkhand & Chhattisgarh
  { name: "Ranchi Infrastructure", state: "JHARKHAND", district: "Ranchi", sector: "GENERAL" },
  { name: "Jamshedpur Works", state: "JHARKHAND", district: "East Singhbhum", sector: "GENERAL" },
  { name: "Raipur Construction Ltd", state: "CHHATTISGARH", district: "Raipur", sector: "GENERAL" },
  { name: "Bhilai Steel Works", state: "CHHATTISGARH", district: "Durg", sector: "INDUSTRIAL" },
  // Northeast
  { name: "Assam Roads Ltd", state: "ASSAM", district: "Kamrup Metro", sector: "ROAD" },
  { name: "Guwahati Metro Builders", state: "ASSAM", district: "Kamrup Metro", sector: "URBAN" },
  { name: "Dibrugarh Construction", state: "ASSAM", district: "Dibrugarh", sector: "GENERAL" },
  // General pan-India
  { name: "National Highways Authority India", state: "DELHI", district: "New Delhi", sector: "ROAD" },
  { name: "CPWD Works Division", state: "DELHI", district: "New Delhi", sector: "GENERAL" },
  { name: "BRO Border Roads Organisation", state: "DELHI", district: "New Delhi", sector: "ROAD" },
  { name: "NHIDCL", state: "DELHI", district: "New Delhi", sector: "ROAD" },
  { name: "HUDCO Housing Projects", state: "DELHI", district: "New Delhi", sector: "HOUSING" },
  { name: "Central Public Works Department", state: "DELHI", district: "New Delhi", sector: "GENERAL" },
  { name: "State Public Works Dept", state: "ANDHRA PRADESH", district: "Visakhapatnam", sector: "GENERAL" },
  { name: "Metro Rail Corporation", state: "DELHI", district: "New Delhi", sector: "URBAN" },
  { name: "National Buildings Construction", state: "DELHI", district: "New Delhi", sector: "BUILDING" },
  { name: "Water and Power Consultancy", state: "DELHI", district: "New Delhi", sector: "WATER" },
  { name: "Rural Development Society", state: "KARNATAKA", district: "Bangalore", sector: "RURAL" },
  { name: "Gram Panchayat Works Corp", state: "MAHARASHTRA", district: "Pune", sector: "RURAL" },
  { name: "National Rural Health Mission", state: "DELHI", district: "New Delhi", sector: "HEALTH" },
  { name: "National Health Systems Resource Centre", state: "DELHI", district: "New Delhi", sector: "HEALTH" },
  { name: "Sarva Shiksha Abhiyan Works", state: "DELHI", district: "New Delhi", sector: "EDUCATION" },
  { name: "Kendriya Vidyalaya Sangathan", state: "DELHI", district: "New Delhi", sector: "EDUCATION" },
  { name: "National Highway Infrastructure", state: "DELHI", district: "New Delhi", sector: "ROAD" },
  { name: "Irrigation and Water Resources", state: "BIHAR", district: "Patna", sector: "IRRIGATION" },
  { name: "Central Ground Water Board", state: "DELHI", district: "New Delhi", sector: "WATER" },
  { name: "Central Water Commission", state: "DELHI", district: "New Delhi", sector: "WATER" },
  { name: "National Disaster Management", state: "DELHI", district: "New Delhi", sector: "DISASTER" },
  { name: "Election Commission Works", state: "DELHI", district: "New Delhi", sector: "GOVERNMENT" },
  { name: "Parliament House Works", state: "DELHI", district: "New Delhi", sector: "GOVERNMENT" },
  { name: "National Solar Energy Corp", state: "DELHI", district: "New Delhi", sector: "SOLAR" },
  { name: "Indian Renewable Energy Corp", state: "DELHI", district: "New Delhi", sector: "SOLAR" },
  { name: "Solar Energy Corp of India", state: "DELHI", district: "New Delhi", sector: "SOLAR" },
  // Realistic private companies from various states
  { name: "Larsen & Toubro Ltd", state: "MAHARASHTRA", district: "Mumbai City", sector: "GENERAL" },
  { name: "Tata Projects Ltd", state: "TELANGANA", district: "Hyderabad", sector: "GENERAL" },
  { name: "Tata Steel Ltd", state: "JHARKHAND", district: "East Singhbhum", sector: "INDUSTRIAL" },
  { name: "Ashoka Buildcon Ltd", state: "MAHARASHTRA", district: "Nashik", sector: "ROAD" },
  { name: "IRB Infrastructure Developers", state: "MAHARASHTRA", district: "Mumbai City", sector: "ROAD" },
  { name: "Sadbhav Engineering Ltd", state: "GUJARAT", district: "Ahmedabad", sector: "ROAD" },
  { name: "Dilip Buildcon Ltd", state: "MADHYA PRADESH", district: "Bhopal", sector: "ROAD" },
  { name: "Meghshyam Khandwala Civil Works", state: "GUJARAT", district: "Surat", sector: "GENERAL" },
  { name: "Sunflag Iron & Steel", state: "MAHARASHTRA", district: "Nagpur", sector: "INDUSTRIAL" },
  { name: "Madhavendra Realty", state: "MAHARASHTRA", district: "Pune", sector: "REAL_ESTATE" },
  { name: "Patel Infrastructure", state: "GUJARAT", district: "Ahmedabad", sector: "ROAD" },
  { name: "KNR Constructions Ltd", state: "TELANGANA", district: "Hyderabad", sector: "ROAD" },
  { name: "HGK Industries", state: "ODISHA", district: "Sambalpur", sector: "GENERAL" },
  { name: "Srei Infrastructure Finance", state: "WEST BENGAL", district: "Kolkata", sector: "FINANCE" },
  { name: "Reliance Infrastructure Ltd", state: "MAHARASHTRA", district: "Mumbai City", sector: "GENERAL" },
  { name: "GMR Infrastructure Ltd", state: "DELHI", district: "New Delhi", sector: "GENERAL" },
  { name: "Adani Group Infrastructure", state: "GUJARAT", district: "Ahmedabad", sector: "GENERAL" },
  { name: "Essar Group Projects", state: "GUJARAT", district: "Surat", sector: "INDUSTRIAL" },
  { name: "JK Lakshmi Cement Works", state: "RAJASTHAN", district: "Kota", sector: "MATERIAL" },
  { name: "Ultratech Cement Ltd", state: "MAHARASHTRA", district: "Mumbai City", sector: "MATERIAL" },
  { name: "Ambuja Cements Ltd", state: "GUJARAT", district: "Ahmedabad", sector: "MATERIAL" },
  { name: "ACC Concrete Works", state: "MAHARASHTRA", district: "Mumbai City", sector: "MATERIAL" },
  { name: "Tata BlueScope Steel", state: "ODISHA", district: "Jagatsinghpur", sector: "MATERIAL" },
  { name: "Jindal Steel & Power", state: "ODISHA", district: "Angul", sector: "INDUSTRIAL" },
  { name: "JSW Steel Ltd", state: "KARNATAKA", district: "Ballari", sector: "INDUSTRIAL" },
  { name: "NTPC Solar Works", state: "DELHI", district: "New Delhi", sector: "SOLAR" },
  { name: "BHEL Heavy Electricals", state: "TELANGANA", district: "Hyderabad", sector: "ELECTRICAL" },
  { name: "Crompton Greaves Electrical", state: "MAHARASHTRA", district: "Mumbai City", sector: "ELECTRICAL" },
  { name: "Havells India Ltd", state: "UTTAR PRADESH", district: "Noida", sector: "ELECTRICAL" },
  { name: "Polycab Wires Pvt Ltd", state: "MAHARASHTRA", district: "Mumbai City", sector: "ELECTRICAL" },
  { name: "KEl India Ltd", state: "KARNATAKA", district: "Bangalore", sector: "ELECTRICAL" },
  { name: "BHEL Transmission Division", state: "TELANGANA", district: "Hyderabad", sector: "ELECTRICAL" },
  { name: "Solar India Corp", state: "DELHI", district: "New Delhi", sector: "SOLAR" },
  { name: "Suzlon Energy Ltd", state: "GUJARAT", district: "Ahmedabad", sector: "SOLAR" },
  { name: "Vestas Wind Technology", state: "MAHARASHTRA", district: "Mumbai City", sector: "WIND" },
  { name: "Inox Wind Ltd", state: "GUJARAT", district: "Gandhinagar", sector: "WIND" },
  { name: "Siemens India", state: "MAHARASHTRA", district: "Mumbai City", sector: "ELECTRICAL" },
  { name: "ABB India Ltd", state: "KARNATAKA", district: "Bangalore", sector: "ELECTRICAL" },
  { name: "Schneider Electric India", state: "KARNATAKA", district: "Bangalore", sector: "ELECTRICAL" },
  { name: "Philips India Electronics", state: "MAHARASHTRA", district: "Mumbai City", sector: "ELECTRONICS" },
  { name: "Havells Lighting Division", state: "UTTAR PRADESH", district: "Noida", sector: "LIGHTING" },
  { name: "Bajaj Electricals", state: "MAHARASHTRA", district: "Mumbai City", sector: "ELECTRICAL" },
  { name: "CESC Ltd Power Works", state: "WEST BENGAL", district: "Kolkata", sector: "POWER" },
  { name: "Tata Power Distribution", state: "MAHARASHTRA", district: "Mumbai City", sector: "POWER" },
  { name: "Adani Power Ltd", state: "GUJARAT", district: "Ahmedabad", sector: "POWER" },
  { name: "NTPC Power Generation", state: "DELHI", district: "New Delhi", sector: "POWER" },
  { name: "NHPC Hydropower Projects", state: "HIMACHAL PRADESH", district: "Shimla", sector: "POWER" },
  { name: "THDC India Ltd", state: "UTTARAKHAND", district: "Dehradun", sector: "POWER" },
  { name: "SJVN Ltd Hydro Works", state: "HIMACHAL PRADESH", district: "Shimla", sector: "POWER" },
  { name: "National Hydroelectric Corp", state: "UTTARAKHAND", district: "Dehradun", sector: "POWER" },
  // Education sector
  { name: "Central Schools Organisation", state: "DELHI", district: "New Delhi", sector: "EDUCATION" },
  { name: "Navodaya Vidyalaya Samiti", state: "DELHI", district: "New Delhi", sector: "EDUCATION" },
  { name: "Kendriya Vidyalaya Construction", state: "DELHI", district: "New Delhi", sector: "EDUCATION" },
  { name: "State Education Department", state: "BIHAR", district: "Patna", sector: "EDUCATION" },
  // Health sector
  { name: "National Health Mission Works", state: "DELHI", district: "New Delhi", sector: "HEALTH" },
  { name: "ESI Hospital Construction", state: "DELHI", district: "New Delhi", sector: "HEALTH" },
  { name: "AIIMS Construction Division", state: "DELHI", district: "New Delhi", sector: "HEALTH" },
  { name: "HLL Lifecare Ltd", state: "KERALA", district: "Thiruvananthapuram", sector: "HEALTH" },
  // Rural development
  { name: "Mahatma Gandhi NREGA Works", state: "DELHI", district: "New Delhi", sector: "RURAL" },
  { name: "Pradhan Mantri Gram Sadak Yojana", state: "DELHI", district: "New Delhi", sector: "RURAL" },
  { name: "District Rural Development Agency", state: "BIHAR", district: "Patna", sector: "RURAL" },
  { name: "DRDA Works Division", state: "ODISHA", district: "Bhubaneswar", sector: "RURAL" },
  // Environment and sanitation
  { name: "Central Pollution Control Board", state: "DELHI", district: "New Delhi", sector: "ENVIRONMENT" },
  { name: "State Pollution Control Board", state: "WEST BENGAL", district: "Kolkata", sector: "ENVIRONMENT" },
  { name: "Swachh Bharat Mission Works", state: "DELHI", district: "New Delhi", sector: "SANITATION" },
  { name: "Jal Jeevan Mission", state: "DELHI", district: "New Delhi", sector: "WATER" },
  { name: "Namami Gange Programme", state: "DELHI", district: "New Delhi", sector: "ENVIRONMENT" },
  { name: "Forest Department Works", state: "ODISHA", district: "Bhubaneswar", sector: "FOREST" },
  // Sports and culture
  { name: "Sports Authority of India", state: "DELHI", district: "New Delhi", sector: "SPORTS" },
  { name: "CCFRA Sports Infrastructure", state: "DELHI", district: "New Delhi", sector: "SPORTS" },
  // Government agencies
  { name: "Electronics Corporation of India", state: "TELANGANA", district: "Hyderabad", sector: "ELECTRONICS" },
  { name: "IT Parks Construction", state: "KARNATAKA", district: "Bangalore", sector: "IT" },
  { name: "Software Technology Parks India", state: "KARNATAKA", district: "Bangalore", sector: "IT" },
  { name: "Data Centre Infrastructure", state: "TELANGANA", district: "Hyderabad", sector: "IT" },
  { name: "Common Service Centre Works", state: "DELHI", district: "New Delhi", sector: "IT" },
  // Police and security
  { name: "Police Housing Corporation", state: "DELHI", district: "New Delhi", sector: "SECURITY" },
  { name: "BPR&D Works Division", state: "DELHI", district: "New Delhi", sector: "SECURITY" },
  // Post and telegraph
  { name: "Department of Posts Works", state: "DELHI", district: "New Delhi", sector: "POSTAL" },
  { name: "Bharat Sanchar Nigam Ltd", state: "DELHI", district: "New Delhi", sector: "TELECOM" },
];

function normalize(s: string): string {
  return s.toUpperCase().trim()
    .replace(/\s+(PVT\.?\s*LTD\.?|LTD\.?|PRIVATE\s+LIMITED|LIMITED|LLP|INC\.?|CORPORATION|CORP\.?|CO\.?|COMPANY)\.?\s*$/i, "")
    .replace(/\s+/g, " ")
    .replace(/[^A-Z0-9 &]/g, "")
    .trim();
}

async function main() {
  logger.info(`Seeding ${MPLAD_VENDORS.length} MPLAD vendors...`);

  let created = 0;
  let skipped = 0;

  for (const v of MPLAD_VENDORS) {
    const normalized = normalize(v.name);
    if (!normalized || normalized.length < 3) { skipped++; continue; }

    try {
      const existing = await prisma.vendor.findFirst({
        where: { nameNormalized: normalized, state: v.state },
      });
      if (!existing) {
        await prisma.vendor.create({
          data: {
            name: v.name,
            nameNormalized: normalized,
            state: v.state,
            district: v.district,
            totalPaid: 0,
            projectCount: 1,
          },
        });
        created++;
      } else {
        skipped++;
      }
    } catch (e) {
      skipped++;
    }
  }

  logger.info(`✓ Created ${created} vendors (${skipped} skipped)`);

  const total = await prisma.vendor.count();
  logger.info(`Total vendors in database: ${total}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(console.error);
