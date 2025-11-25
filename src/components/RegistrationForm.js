// import React, { useState, useEffect } from "react";
// import * as XLSX from "xlsx";
// import { saveAs } from "file-saver";
// import { db, collection, addDoc, getDocs } from "../firebase";
// import PaymentPage from "./PaymentPage";

// export default function RegistrationForm({ isAdmin }) {
//   const [formData, setFormData] = useState({
//     name: "",
//     age: "",
//     playerType: "",
//     mnumber: "",
//     aadhaar: "",
//     address: "",
//     photo: null,
//     paymentScreenshot: null,
//     upiRefNo: "",
//   });

//   const [players, setPlayers] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [submitMessage, setSubmitMessage] = useState("");

//   // Convert file to Base64
//   const toBase64 = (file) => {
//     return new Promise((resolve, reject) => {
//       const reader = new FileReader();
//       reader.readAsDataURL(file);
//       reader.onload = () => resolve(reader.result);
//       reader.onerror = (err) => reject(err);
//     });
//   };

//   const fetchPlayers = async () => {
//     setLoading(true);
//     const querySnapshot = await getDocs(collection(db, "players"));
//     const data = querySnapshot.docs.map((doc) => ({
//       id: doc.id,
//       ...doc.data(),
//     }));
//     setPlayers(data);
//     setLoading(false);
//   };

//   useEffect(() => {
//     if (isAdmin) fetchPlayers();
//   }, [isAdmin]);

//   const handleChange = (e) => {
//     const { name, value, files } = e.target;

//     if (files && files[0]) {
//       setFormData({ ...formData, [name]: files[0] });
//     } else {
//       setFormData({ ...formData, [name]: value });
//     }
//   };

//   // Submit handler with Base64 storage
//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     if (
//       !formData.name ||
//       !formData.age ||
//       !formData.playerType ||
//       !formData.mnumber ||
//       !formData.upiRefNo
//     ) {
//       setSubmitMessage("❗ Please fill all required fields including payment details!");
//       return;
//     }

//     try {
//       let photoBase64 = "";
//       let paymentScreenshotBase64 = "";

//       if (formData.photo) {
//         photoBase64 = await toBase64(formData.photo);
//       }

//       if (formData.paymentScreenshot) {
//         paymentScreenshotBase64 = await toBase64(formData.paymentScreenshot);
//       }

//       await addDoc(collection(db, "pendingPlayers"), {
//         name: formData.name,
//         age: formData.age,
//         playerType: formData.playerType,
//         mnumber: formData.mnumber,
//         aadhaar: formData.aadhaar,
//         address: formData.address,
//         photo: photoBase64,
//         paymentScreenshot: paymentScreenshotBase64,
//         upiRefNo: formData.upiRefNo,
//         approved: false,
//         paymentStatus: "pending",
//         timestamp: new Date(),
//       });

//       setSubmitMessage("✅ Registration Submitted! Please wait for approval.");

//       setFormData({
//         name: "",
//         age: "",
//         playerType: "",
//         mnumber: "",
//         aadhaar: "",
//         address: "",
//         photo: null,
//         paymentScreenshot: null,
//         upiRefNo: "",
//       });

//       setTimeout(() => setSubmitMessage(""), 2500);
//     } catch (error) {
//       console.error("Error:", error);
//       setSubmitMessage("❌ Error submitting registration. Try again.");
//     }
//   };

//   const downloadExcel = () => {
//     const data = players.map((p) => ({
//       Name: p.name,
//       Age: p.age,
//       "Mobile Number": p.mnumber,
//       "Aadhaar Number": p.aadhaar,
//       "Player Type": p.playerType,
//       Address: p.address,
//     }));

//     const worksheet = XLSX.utils.json_to_sheet(data);
//     const workbook = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(workbook, worksheet, "Registrations");

//     const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });

//     const blob = new Blob([excelBuffer], {
//       type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
//     });

//     saveAs(blob, "PPL_Registrations.xlsx");
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4 py-10 relative">
//       <div className="block mb-1 font-medium text-yellow-400">
//         <PaymentPage />
//       </div>
//       <div className="absolute inset-0 bg-black/60">
//       </div>
//       <div className="relative z-10 w-full max-w-4xl bg-gray-900/90 rounded-2xl shadow-2xl p-6 sm:p-10 text-gray-100">
//         <h2 className="text-2xl sm:text-3xl font-bold text-yellow-400 mb-6 text-center border-b border-yellow-500 pb-3">
//           {isAdmin ? "Registered Players" : "Player Registration"}
//         </h2>

//         {!isAdmin ? (
//           <form
//             onSubmit={handleSubmit}
//             className="flex flex-col gap-5 max-h-[70vh] overflow-y-auto pr-2 sm:pr-4"
//           >
//             {["name", "age", "playerType", "mnumber", "aadhaar", "address"].map(
//               (field) => (
//                 <div key={field} className="text-left">
//                   <label className="block mb-1 font-medium text-yellow-400">
//                     {field === "mnumber"
//                       ? "Mobile Number *"
//                       : field.charAt(0).toUpperCase() + field.slice(1)}
//                   </label>

//                   {field === "playerType" ? (
//                     <select
//                       name={field}
//                       value={formData[field]}
//                       onChange={handleChange}
//                       className="w-full p-2 rounded-md bg-gray-800 border border-gray-700"
//                     >
//                       <option value="">Select</option>
//                       <option value="Batsman">Batsman</option>
//                       <option value="Bowler">Bowler</option>
//                       <option value="All-Rounder">All-Rounder</option>
//                       <option value="Wicket Keeper">Wicket Keeper</option>
//                     </select>
//                   ) : field === "address" ? (
//                     <textarea
//                       name={field}
//                       value={formData[field]}
//                       onChange={handleChange}
//                       rows="3"
//                       className="w-full p-2 rounded-md bg-gray-800 border border-gray-700"
//                     ></textarea>
//                   ) : (
//                     <input
//                       type={
//                         field === "age" ||
//                         field === "mnumber" ||
//                         field === "aadhaar"
//                           ? "number"
//                           : "text"
//                       }
//                       name={field}
//                       value={formData[field]}
//                       onChange={handleChange}
//                       className="w-full p-2 rounded-md bg-gray-800 border border-gray-700"
//                       required
//                     />
//                   )}
//                 </div>
//               )
//             )}

//             {/* Player Photo */}
//             <div className="text-left">
//               <label className="block mb-1 font-medium text-yellow-400">
//                 Upload Photo *
//               </label>
//               <input
//                 type="file"
//                 name="photo"
//                 accept="image/*"
//                 onChange={handleChange}
//                 className="w-full p-2 rounded-md bg-gray-800 border border-gray-700"
//                 required
//               />
//             </div>

//             {/* Payment Screenshot */}
//             <div className="text-left">
//               <label className="block mb-1 font-medium text-yellow-400">
//                 Upload Payment Screenshot *
//               </label>
//               <input
//                 type="file"
//                 name="paymentScreenshot"
//                 accept="image/*"
//                 onChange={handleChange}
//                 className="w-full p-2 rounded-md bg-gray-800 border border-gray-700"
//                 required
//               />
//             </div>

//             {/* UPI Reference Number */}
//             <div className="text-left">
//               <label className="block mb-1 font-medium text-yellow-400">
//                 UPI Reference Number *
//               </label>
//               <input
//                 type="text"
//                 name="upiRefNo"
//                 value={formData.upiRefNo}
//                 onChange={handleChange}
//                 className="w-full p-2 rounded-md bg-gray-800 border border-gray-700"
//                 required
//               />
//             </div>

//             {submitMessage && (
//               <p className="text-center text-yellow-400 font-semibold p-2">
//                 {submitMessage}
//               </p>
//             )}

//             <div className="text-center pt-3">
//               <button
//                 type="submit"
//                 className="bg-yellow-500 text-black font-bold px-6 py-2 rounded-lg hover:bg-yellow-400"
//               >
//                 Submit Registration
//               </button>
//             </div>
//           </form>
//         ) : (
//           <>
//             {loading ? (
//               <p className="text-center">Loading...</p>
//             ) : (
//               <>
//                 <div className="overflow-x-auto border border-gray-700 rounded-lg">
//                   <table className="w-full text-sm">
//                     <thead className="bg-gray-800 text-yellow-400">
//                       <tr>
//                         <th className="px-4 py-2">Name</th>
//                         <th className="px-4 py-2">Age</th>
//                         <th className="px-4 py-2">Type</th>
//                         <th className="px-4 py-2">Mobile</th>
//                         <th className="px-4 py-2">Aadhaar</th>
//                         <th className="px-4 py-2">Address</th>
//                         <th className="px-4 py-2">Photo</th>
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {players.map((p) => (
//                         <tr key={p.id} className="border-t border-gray-700">
//                           <td className="px-4 py-2">{p.name}</td>
//                           <td className="px-4 py-2">{p.age}</td>
//                           <td className="px-4 py-2">{p.playerType}</td>
//                           <td className="px-4 py-2">{p.mnumber}</td>
//                           <td className="px-4 py-2">{p.aadhaar}</td>
//                           <td className="px-4 py-2">{p.address}</td>
//                           <td className="px-4 py-2">
//                             {p.photo ? (
//                               <img
//                                 src={p.photo}
//                                 className="h-12 w-12 rounded-full border border-yellow-400"
//                                 alt=""
//                               />
//                             ) : (
//                               "—"
//                             )}
//                           </td>
//                         </tr>
//                       ))}
//                     </tbody>
//                   </table>
//                 </div>

//                 <button
//                   onClick={downloadExcel}
//                   className="mt-4 bg-green-500 px-6 py-2 text-black rounded-lg font-bold"
//                 >
//                   Download Excel
//                 </button>
//               </>
//             )}
//           </>
//         )}
//       </div>
//     </div>
//   );
// }

// import React, { useState, useEffect } from "react";
// import * as XLSX from "xlsx";
// import { saveAs } from "file-saver";
// import { db, collection, addDoc, getDocs } from "../firebase";
// import PaymentPage from "./PaymentPage";

// export default function RegistrationForm({ isAdmin }) {
//   const [formData, setFormData] = useState({
//     name: "",
//     age: "",
//     playerType: "",
//     mnumber: "",
//     aadhaar: "",
//     address: "",
//     photo: null,
//     paymentScreenshot: null,
//     upiRefNo: "",
//   });

//   const [players, setPlayers] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [submitMessage, setSubmitMessage] = useState("");

//   // Convert file to Base64
//   const toBase64 = (file) => {
//     return new Promise((resolve, reject) => {
//       const reader = new FileReader();
//       reader.readAsDataURL(file);
//       reader.onload = () => resolve(reader.result);
//       reader.onerror = (err) => reject(err);
//     });
//   };

//   const fetchPlayers = async () => {
//     setLoading(true);
//     const querySnapshot = await getDocs(collection(db, "players"));
//     const data = querySnapshot.docs.map((doc) => ({
//       id: doc.id,
//       ...doc.data(),
//     }));
//     setPlayers(data);
//     setLoading(false);
//   };

//   useEffect(() => {
//     if (isAdmin) fetchPlayers();
//   }, [isAdmin]);

//   const handleChange = (e) => {
//     const { name, value, files } = e.target;

//     if (files && files[0]) {
//       setFormData({ ...formData, [name]: files[0] });
//     } else {
//       setFormData({ ...formData, [name]: value });
//     }
//   };

//   // Submit handler with Base64 storage
//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     if (
//       !formData.name ||
//       !formData.age ||
//       !formData.playerType ||
//       !formData.mnumber ||
//       !formData.upiRefNo
//     ) {
//       setSubmitMessage("❗ Please fill all required fields including payment!");
//       return;
//     }

//     try {
//       let photoBase64 = "";
//       let paymentScreenshotBase64 = "";

//       if (formData.photo) {
//         photoBase64 = await toBase64(formData.photo);
//       }

//       if (formData.paymentScreenshot) {
//         paymentScreenshotBase64 = await toBase64(formData.paymentScreenshot);
//       }

//       await addDoc(collection(db, "pendingPlayers"), {
//         name: formData.name,
//         age: formData.age,
//         playerType: formData.playerType,
//         mnumber: formData.mnumber,
//         aadhaar: formData.aadhaar,
//         address: formData.address,
//         photo: photoBase64,
//         paymentScreenshot: paymentScreenshotBase64,
//         upiRefNo: formData.upiRefNo,
//         approved: false,
//         paymentStatus: "pending",
//         timestamp: new Date(),
//       });

//       setSubmitMessage("✅ Registration Submitted!");

//       setFormData({
//         name: "",
//         age: "",
//         playerType: "",
//         mnumber: "",
//         aadhaar: "",
//         address: "",
//         photo: null,
//         paymentScreenshot: null,
//         upiRefNo: "",
//       });

//       setTimeout(() => setSubmitMessage(""), 2500);
//     } catch (error) {
//       console.error("Error:", error);
//       setSubmitMessage("❌ Error submitting registration. Try again.");
//     }
//   };

//   const downloadExcel = () => {
//     const data = players.map((p) => ({
//       Name: p.name,
//       Age: p.age,
//       "Mobile Number": p.mnumber,
//       "Aadhaar Number": p.aadhaar,
//       "Player Type": p.playerType,
//       Address: p.address,
//     }));

//     const worksheet = XLSX.utils.json_to_sheet(data);
//     const workbook = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(workbook, worksheet, "Registrations");

//     const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });

//     const blob = new Blob([excelBuffer], {
//       type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
//     });

//     saveAs(blob, "PPL_Registrations.xlsx");
//   };

//   return (
//     <div className="min-h-screen flex flex-col items-center justify-start bg-gray-900 px-2 py-4 relative">
      

//       {/* Background overlay */}
//       <div className="absolute inset-0 bg-black/40" />

//       {/* Form Wrapper */}
//       <div className="relative z-10 w-full max-w-3xl bg-gray-900/95 rounded-xl shadow-xl p-4 sm:p-6 text-gray-100">

//         <h2 className="text-xl sm:text-2xl font-bold text-yellow-400 mb-4 text-center border-b border-yellow-500 pb-2">
//           {isAdmin ? "Registered Players" : "Player Registration"}
//         </h2>

//         {!isAdmin ? (
//           <>
//           <div className="flex justify-center w-full">
//             <div className="w-full max-w-md mb-3 relative z-10">
//               <PaymentPage />
//             </div>
//           </div>
//           <form
//             onSubmit={handleSubmit}
//             className="flex flex-col gap-3 max-h-[72vh] overflow-y-auto pr-1 sm:pr-2"
//           >
//             {["name", "age", "playerType", "mnumber", "aadhaar", "address"].map(
//               (field) => (
//                 <div key={field} className="text-left mb-1">
//                   <label className="block mb-0.5 font-medium text-yellow-400 text-sm">
//                     {field === "mnumber"
//                       ? "Mobile Number *"
//                       : field.charAt(0).toUpperCase() + field.slice(1)}
//                   </label>

//                   {field === "playerType" ? (
//                     <select
//                       name={field}
//                       value={formData[field]}
//                       onChange={handleChange}
//                       className="w-full p-2 rounded-md bg-gray-800 border border-gray-700 text-sm"
//                     >
//                       <option value="">Select</option>
//                       <option value="Batsman">Batsman</option>
//                       <option value="Bowler">Bowler</option>
//                       <option value="All-Rounder">All-Rounder</option>
//                       <option value="Wicket Keeper">Wicket Keeper</option>
//                     </select>
//                   ) : field === "address" ? (
//                     <textarea
//                       name={field}
//                       value={formData[field]}
//                       onChange={handleChange}
//                       rows="2" required 
//                       className="w-full p-2 rounded-md bg-gray-800 border border-gray-700 text-sm"
//                     ></textarea>
//                   ) : (
//                     <input
//                       type={
//                         field === "age" ||
//                         field === "mnumber" ||
//                         field === "aadhaar"
//                           ? "number"
//                           : "text"
//                       }
//                       name={field}
//                       value={formData[field]}
//                       onChange={handleChange}
//                       className="w-full p-2 rounded-md bg-gray-800 border border-gray-700 text-sm"
//                       required
//                     />
//                   )}
//                 </div>
//               )
//             )}

//             {/* Player Photo */}
//             <div className="text-left mb-1">
//               <label className="block mb-0.5 font-medium text-yellow-400 text-sm">
//                 Player Photo *
//               </label>
//               <input
//                 type="file"
//                 name="photo"
//                 accept="image/*"
//                 onChange={handleChange}
//                 className="w-full p-2 rounded-md bg-gray-800 border border-gray-700 text-sm"
//                 required
//               />
//             </div>

//             {/* Payment Screenshot */}
//             <div className="text-left mb-1">
//               <label className="block mb-0.5 font-medium text-yellow-400 text-sm">
//                 Payment Screenshot *
//               </label>
//               <input
//                 type="file"
//                 name="paymentScreenshot"
//                 accept="image/*"
//                 onChange={handleChange}
//                 className="w-full p-2 rounded-md bg-gray-800 border border-gray-700 text-sm"
//                 required
//               />
//             </div>

//             {/* UPI Reference Number */}
//             <div className="text-left mb-1">
//               <label className="block mb-0.5 font-medium text-yellow-400 text-sm">
//                 UPI Reference Number *
//               </label>
//               <input
//                 type="text"
//                 name="upiRefNo"
//                 value={formData.upiRefNo}
//                 onChange={handleChange}
//                 className="w-full p-2 rounded-md bg-gray-800 border border-gray-700 text-sm"
//                 required
//               />
//             </div>

//             {submitMessage && (
//               <p className="text-center text-yellow-400 font-semibold p-2 text-sm">
//                 {submitMessage}
//               </p>
//             )}

//             <div className="text-center pt-1">
//               <button
//                 type="submit"
//                 className="bg-yellow-500 text-black font-bold px-6 py-2 rounded-lg text-sm hover:bg-yellow-400"
//               >
//                 Submit
//               </button>
//             </div>
//           </form>
//           </>
//         ) : (
//           <>
//             {loading ? (
//               <p className="text-center">Loading...</p>
//             ) : (
//               <>
//                 <div className="overflow-x-auto border border-gray-700 rounded-lg">
//                   <table className="w-full text-sm">
//                     <thead className="bg-gray-800 text-yellow-400">
//                       <tr>
//                         <th className="px-4 py-2">Name</th>
//                         <th className="px-4 py-2">Age</th>
//                         <th className="px-4 py-2">Type</th>
//                         <th className="px-4 py-2">Mobile</th>
//                         <th className="px-4 py-2">Aadhaar</th>
//                         <th className="px-4 py-2">Address</th>
//                         <th className="px-4 py-2">Photo</th>
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {players.map((p) => (
//                         <tr key={p.id} className="border-t border-gray-700">
//                           <td className="px-4 py-2">{p.name}</td>
//                           <td className="px-4 py-2">{p.age}</td>
//                           <td className="px-4 py-2">{p.playerType}</td>
//                           <td className="px-4 py-2">{p.mnumber}</td>
//                           <td className="px-4 py-2">{p.aadhaar}</td>
//                           <td className="px-4 py-2">{p.address}</td>
//                           <td className="px-4 py-2">
//                             {p.photo ? (
//                               <img
//                                 src={p.photo}
//                                 className="h-12 w-12 rounded-full border border-yellow-400"
//                                 alt=""
//                               />
//                             ) : (
//                               "—"
//                             )}
//                           </td>
//                         </tr>
//                       ))}
//                     </tbody>
//                   </table>
//                 </div>

//                 <button
//                   onClick={downloadExcel}
//                   className="mt-4 bg-green-500 px-6 py-2 text-black rounded-lg font-bold"
//                 >
//                   Download Excel
//                 </button>
//               </>
//             )}
//           </>
//         )}
//       </div>
//     </div>
//   );
// }

import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { db, collection, addDoc, getDocs } from "../firebase";
import PaymentPage from "./PaymentPage";

export default function RegistrationForm({ isAdmin }) {
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    playerType: "",
    mnumber: "",
    aadhaar: "",
    address: "",
    photo: null,
    paymentScreenshot: null,
    upiRefNo: "",
  });

  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");

  // Convert file to Base64
  const toBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
    });

  const fetchPlayers = async () => {
    setLoading(true);
    const querySnapshot = await getDocs(collection(db, "players"));
    const data = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setPlayers(data);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) fetchPlayers();
  }, [isAdmin]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (files && files[0]) {
      setFormData({ ...formData, [name]: files[0] });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

//   const handleSubmit = async (e) => {
//   e.preventDefault();

//   if (
//     !formData.name ||
//     !formData.age ||
//     !formData.playerType ||
//     !formData.mnumber ||
//     !formData.upiRefNo
//   ) {
//     setSubmitMessage("❗ Please fill all required fields including payment!");
//     return;
//   }

//   // --------- 🔍 CHECK DUPLICATE ENTRY (FRONTEND ONLY) ----------
//   // Check inside already fetched players (approved)
//   const mobileExists = players.some(
//     (p) => p.mnumber === formData.mnumber
//   );

//   const upiExists = players.some(
//     (p) => p.upiRefNo === formData.upiRefNo
//   );

//   const aadhaarExists = players.some(
//     (p) => p.aadhaar === formData.aadhaar
//   );

//   if (mobileExists || upiExists || aadhaarExists) {
//     setSubmitMessage("❗ User already registered!");
//     setTimeout(() => setSubmitMessage(""), 2500);
//     return; // 🚫 STOP — NO SUBMIT
//   }
//   // ---------------------------------------------------------------

//   try {
//     let photoBase64 = "";
//     let paymentScreenshotBase64 = "";

//     if (formData.photo) photoBase64 = await toBase64(formData.photo);
//     if (formData.paymentScreenshot)
//       paymentScreenshotBase64 = await toBase64(formData.paymentScreenshot);

//     await addDoc(collection(db, "pendingPlayers"), {
//       ...formData,
//       photo: photoBase64,
//       paymentScreenshot: paymentScreenshotBase64,
//       approved: false,
//       paymentStatus: "pending",
//       timestamp: new Date(),
//     });

//     setSubmitMessage(
//       "✅ Registration submitted! Please wait for admin approval."
//     );

//     setFormData({
//       name: "",
//       age: "",
//       playerType: "",
//       mnumber: "",
//       aadhaar: "",
//       address: "",
//       photo: null,
//       paymentScreenshot: null,
//       upiRefNo: "",
//     });

//     setTimeout(() => setSubmitMessage(""), 2500);
//   } catch (err) {
//     console.error(err);
//     setSubmitMessage("❌ Error submitting registration. Please check the rule above & Try again.");
//   }
// };


const handleSubmit = async (e) => {
  e.preventDefault();

  if (
    !formData.name ||
    !formData.age ||
    !formData.playerType ||
    !formData.mnumber ||
    !formData.upiRefNo
  ) {
    setSubmitMessage("❗ Please fill all required fields including payment!");
    return;
  }

  try {
    // 🔍 STEP 1: COUNT APPROVED PLAYERS FROM FIRESTORE
    const approvedSnap = await getDocs(collection(db, "players"));
    const approvedCount = approvedSnap.size;  // total approved entries

    console.log("Approved players count:", approvedCount);

    if (approvedCount >= 120) {
      setSubmitMessage("❗ Registration Closed! 120 Players Already Registered.");
      setTimeout(() => setSubmitMessage(""), 3000);
      return;
    }

    // 🔍 STEP 2: CHECK DUPLICATES INSIDE APPROVED PLAYERS
    const playersData = approvedSnap.docs.map((doc) => doc.data());

    const mobileExists = playersData.some(
      (p) => p.mnumber === formData.mnumber
    );

    const upiExists = playersData.some(
      (p) => p.upiRefNo === formData.upiRefNo
    );

    const aadhaarExists = playersData.some(
      (p) => p.aadhaar === formData.aadhaar
    );

    if (mobileExists || upiExists || aadhaarExists) {
      setSubmitMessage("❗ User already registered!");
      setTimeout(() => setSubmitMessage(""), 2500);
      return;
    }

    // 🔍 STEP 3: Convert files to Base64
    let photoBase64 = "";
    let paymentScreenshotBase64 = "";

    if (formData.photo) photoBase64 = await toBase64(formData.photo);
    if (formData.paymentScreenshot)
      paymentScreenshotBase64 = await toBase64(formData.paymentScreenshot);

    // 🔍 STEP 4: ADD TO pendingPlayers (admin approval needed)
    await addDoc(collection(db, "pendingPlayers"), {
      ...formData,
      photo: photoBase64,
      paymentScreenshot: paymentScreenshotBase64,
      approved: false,
      paymentStatus: "pending",
      timestamp: new Date(),
    });

    setSubmitMessage(
      "✅ Registration submitted! Please wait for admin approval."
    );

    setFormData({
      name: "",
      age: "",
      playerType: "",
      mnumber: "",
      aadhaar: "",
      address: "",
      photo: null,
      paymentScreenshot: null,
      upiRefNo: "",
    });

    setTimeout(() => setSubmitMessage(""), 2500);
  } catch (err) {
    console.error(err);
    setSubmitMessage("❌ Error submitting registration. Please try again.");
  }
};



  const downloadExcel = () => {
    const data = players.map((p) => ({
      Name: p.name,
      Age: p.age,
      "Mobile Number": p.mnumber,
      "Aadhaar Number": p.aadhaar,
      "Player Type": p.playerType,
      Address: p.address,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Registrations");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });

    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(blob, "PPL_Registrations.xlsx");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gray-900 px-2 py-4 relative">
      {/* Form Wrapper */}
      <div className="relative z-10 w-full max-w-3xl bg-gray-900/95 rounded-xl shadow-xl p-4 sm:p-6 text-gray-100 flex flex-col sm:flex-row gap-6">
        {!isAdmin && (
          <>
            {/* ------------------ STICKY RULES ------------------ */}
            <div className="hidden sm:block w-60 sticky top-6 h-max self-start bg-gray-800/80 border border-yellow-500 rounded-lg p-3 text-gray-200 shadow-md">
              <h3 className="text-yellow-400 font-bold mb-2 text-center">Rules</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Photo must be ≤ 1 MB</li>
                <li>Pay ₹300 by scanning the QR before registration</li>
                <li>After submission, admin will verify and approve</li>
                <li>If data is incorrect, admin may reject</li>
              </ul>
            </div>

            {/* ------------------ FORM & PAYMENT ------------------ */}
            <div className="flex-1 flex flex-col gap-3">
              {/* Mobile rules */}
              <div className="sm:hidden w-full bg-gray-800/80 border border-yellow-500 rounded-lg p-3 text-gray-200 mb-2">
                <h3 className="text-yellow-400 font-bold mb-2 text-center">Rules</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Photo must be ≤ 1 MB</li>
                  <li>Pay ₹300 by scanning the QR before registration</li>
                  <li>After submission, admin will verify and approve</li>
                  <li>If data is incorrect, admin may reject</li>
                </ul>
              </div>

              {/* Payment Page */}
              <div className="flex justify-center w-full mb-3">
                <div className="w-full max-w-md">
                  <PaymentPage />
                </div>
              </div>

              {/* Registration Form */}
              <form
                onSubmit={handleSubmit}
                className="w-full flex flex-col gap-3 max-h-[72vh] overflow-y-auto pr-1 sm:pr-2"
              >
                {["name", "age", "playerType", "mnumber", "aadhaar", "address"].map(
                  (field) => (
                    <div key={field} className="text-left mb-1">
                      <label className="block mb-0.5 font-medium text-yellow-400 text-sm">
                        {field === "mnumber"
                          ? "Mobile Number *"
                          : field.charAt(0).toUpperCase() + field.slice(1)}
                      </label>

                      {field === "playerType" ? (
                        <select
                          name={field}
                          value={formData[field]}
                          onChange={handleChange}
                          className="w-full p-2 rounded-md bg-gray-800 border border-gray-700 text-sm"
                        >
                          <option value="">Select</option>
                          <option value="Batsman">Batsman</option>
                          <option value="Bowler">Bowler</option>
                          <option value="All-Rounder">All-Rounder</option>
                          <option value="Wicket Keeper">Wicket Keeper</option>
                        </select>
                      ) : field === "address" ? (
                        <textarea
                          name={field}
                          value={formData[field]}
                          onChange={handleChange}
                          rows="2"
                          required
                          className="w-full p-2 rounded-md bg-gray-800 border border-gray-700 text-sm"
                        ></textarea>
                      ) : (
                        <input
                          type={
                            field === "age" ||
                            field === "mnumber" ||
                            field === "aadhaar"
                              ? "number"
                              : "text"
                          }
                          name={field}
                          value={formData[field]}
                          onChange={handleChange}
                          className="w-full p-2 rounded-md bg-gray-800 border border-gray-700 text-sm"
                          required
                        />
                      )}
                    </div>
                  )
                )}

                {/* Player Photo */}
                <div className="text-left mb-1">
                  <label className="block mb-0.5 font-medium text-yellow-400 text-sm">
                    Player Photo *
                  </label>
                  <input
                    type="file"
                    name="photo"
                    accept="image/*"
                    onChange={handleChange}
                    className="w-full p-2 rounded-md bg-gray-800 border border-gray-700 text-sm"
                    required
                  />
                </div>

                {/* Payment Screenshot */}
                <div className="text-left mb-1">
                  <label className="block mb-0.5 font-medium text-yellow-400 text-sm">
                    Payment Screenshot *
                  </label>
                  <input
                    type="file"
                    name="paymentScreenshot"
                    accept="image/*"
                    onChange={handleChange}
                    className="w-full p-2 rounded-md bg-gray-800 border border-gray-700 text-sm"
                    required
                  />
                </div>

                {/* UPI Reference Number */}
                <div className="text-left mb-1">
                  <label className="block mb-0.5 font-medium text-yellow-400 text-sm">
                    UPI Reference Number *
                  </label>
                  <input
                    type="text"
                    name="upiRefNo"
                    value={formData.upiRefNo}
                    onChange={handleChange}
                    className="w-full p-2 rounded-md bg-gray-800 border border-gray-700 text-sm"
                    required
                  />
                </div>

                {submitMessage && (
                  <p className="text-center text-yellow-400 font-semibold p-2 text-sm">
                    {submitMessage}
                  </p>
                )}

                <div className="text-center pt-1">
                  <button
                    type="submit"
                    className="bg-yellow-500 text-black font-bold px-6 py-2 rounded-lg text-sm hover:bg-yellow-400"
                  >
                    Submit
                  </button>
                </div>
              </form>
            </div>
          </>
        )}

        {/* ------------------ ADMIN VIEW ------------------ */}
        {/* ------------------ ADMIN VIEW ------------------ */}
          {isAdmin && (
            <>
              {loading ? (
                <p className="text-center">Loading...</p>
              ) : (
                <div className="w-full flex flex-col gap-4">
                  <div className="w-full overflow-x-auto border border-gray-700 rounded-lg">
                    {/* <table className="w-full text-sm">
                      <thead className="bg-gray-800 text-yellow-400">
                        <tr>
                          <th className="px-4 py-2">Name</th>
                          <th className="px-4 py-2">Age</th>
                          <th className="px-4 py-2">Type</th>
                          <th className="px-4 py-2">Mobile</th>
                          <th className="px-4 py-2">Aadhaar</th>
                          <th className="px-4 py-2">Address</th>
                          <th className="px-4 py-2">Photo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {players.map((p) => (
                          <tr key={p.id} className="border-t border-gray-700">
                            <td className="px-4 py-2">{p.name}</td>
                            <td className="px-4 py-2">{p.age}</td>
                            <td className="px-4 py-2">{p.playerType}</td>
                            <td className="px-4 py-2">{p.mnumber}</td>
                            <td className="px-4 py-2">{p.aadhaar}</td>
                            <td className="px-4 py-2">{p.address}</td>
                            <td className="px-4 py-2">
                              {p.photo ? (
                                <img
                                  src={p.photo}
                                  className="h-12 w-12 rounded-full border border-yellow-400"
                                  alt=""
                                />
                              ) : (
                                "—"
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table> */}

          <table className="w-full text-sm">
            <thead className="bg-gray-800 text-yellow-400">
              <tr>
                <th className="px-4 py-2">#</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Age</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Mobile</th>
                <th className="px-4 py-2">Aadhaar</th>
                <th className="px-4 py-2">Address</th>
                <th className="px-4 py-2">Photo</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p, index) => (
                <tr key={p.id} className="border-t border-gray-700">
                  <td className="px-4 py-2 font-bold text-yellow-300">{index + 1}</td>
                  <td className="px-4 py-2">{p.name}</td>
                  <td className="px-4 py-2">{p.age}</td>
                  <td className="px-4 py-2">{p.playerType}</td>
                  <td className="px-4 py-2">{p.mnumber}</td>
                  <td className="px-4 py-2">{p.aadhaar}</td>
                  <td className="px-4 py-2">{p.address}</td>
                  <td className="px-4 py-2">
                    {p.photo ? (
                      <img
                        src={p.photo}
                        className="h-12 w-12 rounded-full border border-yellow-400"
                        alt=""
                      />
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

        </div>

        {/* Button at bottom */}
        <div className="flex justify-center">
          <button
            onClick={downloadExcel}
            className="bg-green-500 px-6 py-2 text-black rounded-lg font-bold hover:bg-green-400"
          >
            Download Excel
          </button>
        </div>
      </div>
    )}
  </>
)}
      </div>
    </div>
  );
}
