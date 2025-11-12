// // src/screens/AddPatientFormMobile.tsx
// import React, { useCallback, useEffect, useMemo, useState } from "react";
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   StatusBar,
//   Platform,
//   TextInput,
//   TouchableOpacity,
//   Dimensions,
//   Image,
//   KeyboardAvoidingView,
//   Alert,
// } from "react-native";
// import { useRoute, useNavigation } from "@react-navigation/native";
// import { useSafeAreaInsets } from "react-native-safe-area-context";
// import { useDispatch, useSelector } from "react-redux";
// import { User } from "lucide-react-native";
// import DateTimePicker from "@react-native-community/datetimepicker";

// import Footer from "../dashboard/footer";
// import { RootState } from "../../store/store";
// import { AuthFetch, AuthPost } from "../../auth/auth";
// import { debounce, DEBOUNCE_DELAY } from "../../utils/debounce";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { showError, showSuccess } from "../../store/toast.slice";

// import { state, city } from "../../utils/stateCity"; // Import state-city data
// import { Role_NAME } from "../../utils/role";
// import { genderList } from "../../utils/addPatientFormHelper";

// const { width: W } = Dimensions.get("window");
// const FOOTER_HEIGHT = 64;

// type Category = "neonate" | "child" | "adult";
// type FormField<T = any> = {
//   value: T;
//   valid: boolean;
//   showError: boolean;
//   message?: string;
// };

// type FormState = {
//   pID: FormField<string>;
//   pUHID: FormField<string>;
//   dob: FormField<string>;
//   age: FormField<string>;
//   gender: FormField<number | null>;
//   pName: FormField<string>;
//   title: FormField<string>;
//   phoneNumber: FormField<string | null>;
//   email: FormField<string>;
//   address: FormField<string>;
//   city: FormField<string>;
//   state: FormField<string>;
//   pinCode: FormField<string>;
//   referredBy: FormField<string>;
//   weight: FormField<number | null>;
//   height: FormField<number | null>;
//   insurance: FormField<0 | 1>;
//   department: FormField<string>;
//   departmentID: FormField<number | null>;
//   userID: FormField<number | null>;
// };

// const initialState: FormState = {
//   pID: { value: "", valid: true, showError: false },
//   pUHID: { value: "", valid: false, showError: false, message: "UHID must be 14 digits" },
//   dob: { value: "", valid: false, showError: false },
//   age: { value: "", valid: false, showError: false },
//   gender: { value: null, valid: false, showError: false },
//   pName: { value: "", valid: false, showError: false },
//   title: { value: "", valid: false, showError: false },
//   phoneNumber: { value: null, valid: false, showError: false },
//   email: { value: "", valid: true, showError: false },
//   address: { value: "", valid: false, showError: false },
//   city: { value: "", valid: false, showError: false },
//   state: { value: "", valid: false, showError: false },
//   pinCode: { value: "", valid: false, showError: false },
//   referredBy: { value: "", valid: true, showError: false },
//   weight: { value: null, valid: false, showError: false },
//   height: { value: null, valid: false, showError: false },
//   insurance: { value: 0, valid: true, showError: false },
//   department: { value: "", valid: false, showError: false },
//   departmentID: { value: null, valid: false, showError: false },
//   userID: { value: null, valid: false, showError: false },
// };

// const AddPatientFormMobile: React.FC = () => {
//   const route = useRoute<any>();
//   const navigation = useNavigation<any>();
//   const insets = useSafeAreaInsets();
//   const dispatch = useDispatch();

//   const user = useSelector((s: RootState) => s.currentUser);
// const patientStartStatus = useSelector((s: RootState) => s.currentUser?.patientStatus);
// console.log(user, "patient status");
//   const category: Category = (route.params?.category ?? "adult") as Category;

//   const [form, setForm] = useState<FormState>(initialState);
//   const [ageUnit, setAgeUnit] = useState<"days" | "months" | "years">("years");
//   const [photoUri, setPhotoUri] = useState<string | null>(null);
//   const [showDatePicker, setShowDatePicker] = useState(false);
//   const [selectedDate, setSelectedDate] = useState<Date | null>(null);
//   const [cityList, setCityList] = useState<string[]>([]);
//   const [departmentList, setDepartmentList] = useState<{ id: number; name: string }[]>([]);
//   const [doctorList, setDoctorList] = useState<any[]>([]);
//   const [filteredDoctors, setFilteredDoctors] = useState<any[]>([]);
//   const [titleList, setTitleList] = useState<string[]>([]);

//   // Generate Appointment ID
//   useEffect(() => {
//     const value = "APT-" + Math.random().toString(36).slice(2, 8).toUpperCase();
//     setForm(f => ({ ...f, pID: { ...f.pID, value, valid: true, showError: false } }));
//   }, []);

//   // Title list based on category
//   useEffect(() => {
//     if (category === "neonate") {
//       setTitleList(["B/O"]);
//       setField("title", { value: "B/O", valid: true });
//     } else if (category === "child") {
//       setTitleList(["Master", "Miss"]);
//       setField("title", { value: "Master", valid: true });
//     } else {
//       setTitleList(["Mr.", "Mrs.", "Miss", "Ms."]);
//       setField("title", { value: "Mr.", valid: true });
//     }
//   }, [category]);

//   // Fetch departments & doctors
//   useEffect(() => {
//     if (!user?.token || !user?.hospitalID) return;

//     const fetchData = async () => {
//       try {
//         const deptRes = await AuthFetch(`department/${user.hospitalID}`, user.token);
//         if (deptRes?.data?.message === "success") setDepartmentList(deptRes.data?.departments);

//         const docRes = await AuthFetch(`user/${user.hospitalID}/list/${Role_NAME.doctor}`, user.token);
//         if (docRes?.data?.message === "success") setDoctorList(docRes?.data?.users);
//       } catch (err) {
//         console.error("Failed to fetch departments/doctors", err);
//       }
//     };

//     fetchData();
//   }, [user?.token, user?.hospitalID]);

//   // Auto-fill for HOD (role 4000)
//   useEffect(() => {
//     if (user?.role === 4000 && user?.departmentID && departmentList.length > 0) {
//       const dept = departmentList.find(d => d.id === user.departmentID);
//       if (dept) {
//         const hodEntry = {
//           id: user.id,
//           firstName: user.firstName,
//           lastName: user.lastName,
//           departmentID: user.departmentID,
//         };
//         setFilteredDoctors([hodEntry, ...doctorList.filter(d => d.departmentID === user.departmentID)]);
//         setForm(prev => ({
//           ...prev,
//           department: { value: dept.name, valid: true, showError: false },
//           departmentID: { value: user.departmentID, valid: true, showError: false },
//           userID: { value: user.id, valid: true, showError: false },
//         }));
//       }
//     }
//   }, [user, departmentList, doctorList]);

//   // Filter doctors by department
//   useEffect(() => {
//     if (form.departmentID.value && user?.role !== 4000) {
//       setFilteredDoctors(doctorList.filter(d => d.departmentID === form.departmentID.value));
//     } else if (user?.role !== 4000) {
//       setFilteredDoctors(doctorList);
//     }
//   }, [form.departmentID.value, doctorList, user?.role]);

//   // Update city list when state changes
//   useEffect(() => {
//     const idx = state.indexOf(form.state.value);
//     setCityList(idx >= 0 ? city[idx] : []);
//   }, [form.state.value]);

//   const setField = useCallback(<K extends keyof FormState>(key: K, update: Partial<FormState[K]>) => {
//     setForm(prev => ({ ...prev, [key]: { ...prev[key], ...update } }));
//   }, []);

//   // UHID formatting
//   const validateUHID = useCallback((raw: string) => {
//     const digitsOnly = raw.replace(/\D/g, "").slice(0, 14);
//     const g1 = digitsOnly.slice(0, 4);
//     const g2 = digitsOnly.slice(4, 7);
//     const g3 = digitsOnly.slice(7, 10);
//     const g4 = digitsOnly.slice(10, 14);
//     const formatted = [g1, g2, g3, g4].filter(Boolean).join("-");
//     const ok = digitsOnly.length === 14;
//     setField("pUHID", {
//       value: formatted,
//       valid: ok,
//       showError: digitsOnly.length > 0 && !ok,
//       message: ok ? "" : "UHID must be 14 digits",
//     });
//   }, [setField]);

//   // Age validation
//   const checkAgeRule = useCallback((val: number, unit: "days"|"months"|"years"): {ok: boolean; msg?: string} => {
//     if (category === "neonate") {
//       if (unit !== "days") return { ok: false, msg: "Neonate age must be in days" };
//       if (val < 0 || val > 28) return { ok: false, msg: "Neonate age should be 0–28 days" };
//       return { ok: true };
//     }
//     if (category === "child") {
//       if (unit === "days" || unit === "months") {
//         const days = unit === "days" ? val : val * 30;
//         if (days <= 28) return { ok: false, msg: "Child age must be > 28 days" };
//         return { ok: true };
//       } else {
//         if (val >= 18) return { ok: false, msg: "Child age must be < 18 years" };
//         return { ok: true };
//       }
//     }
//     if (unit !== "years") return { ok: false, msg: "Adult age must be in years" };
//     if (val < 18) return { ok: false, msg: "Adult age must be ≥ 18 years" };
//     return { ok: true };
//   }, [category]);

//   // DOB → Age
//   const updateAgeFromDOB = useCallback((dobStr: string) => {
//     if (!dobStr) return;
//     const dob = new Date(dobStr);
//     const today = new Date();
//     const days = Math.max(0, Math.floor((today.getTime() - dob.getTime()) / (1000 * 3600 * 24)));

//     let unit: "days" | "years" = "days";
//     if (category === "neonate") unit = "days";
//     else if (category === "adult") unit = "years";
//     else unit = days < 365 ? "days" : "years";

//     const value = unit === "days" ? days : Math.floor(days / 365.25);
//     const rule = checkAgeRule(value, unit);
//     setAgeUnit(unit);
//     setField("age", {
//       value: `${value} ${unit}`,
//       valid: rule.ok,
//       showError: !rule.ok,
//       message: rule.ok ? "" : rule.msg,
//     });
//   }, [category, checkAgeRule, setField]);

//   // Text change handler
//   const onChangeText = (key: keyof FormState, text: string) => {
//     if (key === "pName" || key === "referredBy" || key === "title") {
//       if (!/^[A-Za-z\s.]*$/.test(text) || text.length > 50) return;
//     }
//     if (key === "phoneNumber" || key === "pinCode") {
//       text = text.replace(/\D/g, "");
//     }
//     if (key === "email") {
//       const ok = text === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
//       setField("email", { value: text, valid: ok, showError: !ok, message: ok ? "" : "Invalid email format" });
//       return;
//     }
//     if (key === "pUHID") {
//       validateUHID(text);
//       return;
//     }
//     if (key === "dob") {
//       setField("dob", { value: text, valid: !!text, showError: !text });
//       if (text) updateAgeFromDOB(text);
//       return;
//     }
//     if (key === "age") {
//       const raw = text.trim();
//       const n = raw === "" ? NaN : parseInt(raw, 10);
//       const ok = !Number.isNaN(n);
//       const rule = ok ? checkAgeRule(n, ageUnit) : { ok: false, msg: "This field is required" };
//       setField("age", {
//         value: raw === "" ? "" : `${raw} ${ageUnit}`,
//         valid: ok && rule.ok,
//         showError: raw !== "" && !(ok && rule.ok),
//         message: ok ? (rule.ok ? "" : rule.msg) : "This field is required",
//       });
//       return;
//     }
//     if (key === "weight" || key === "height") {
//       const num = text === "" ? null : Number(text);
//       const isValid = num !== null && !Number.isNaN(num) && num >= 0;
//       setField(key, { value: num as any, valid: isValid, showError: !isValid, message: isValid ? "" : "Required" });
//       return;
//     }

//     setField(key as any, { value: text, valid: text.trim().length > 0, showError: text.trim().length === 0 });
//   };

//   const onUnitChange = (unit: "days" | "months" | "years") => {
//     setAgeUnit(unit);
//     const n = parseInt((form.age.value || "").split(" ")[0] || "0", 10);
//     const rule = checkAgeRule(n, unit);
//     setField("age", {
//       value: isNaN(n) ? "" : `${n} ${unit}`,
//       valid: !isNaN(n) && rule.ok,
//       showError: isNaN(n) ? false : !rule.ok,
//       message: rule.ok ? "" : rule.msg,
//     });
//   };

//  const onGenderSelect = (key: 1 | 2 | 3) => {
//   const selectedGender = genderList.find(g => g.key === key);
//   if (selectedGender) {
//     setField("gender", { value: selectedGender.value, valid: true, show: false });
//   }
// };

//   const onInsuranceSelect = (val: 0 | 1) => {
//     setField("insurance", { value: val, valid: true, showError: false });
//   };

//   const onDepartmentSelect = (deptId: number, deptName: string) => {
//     setField("department", { value: deptName, valid: true, showError: false });
//     setField("departmentID", { value: deptId, valid: true, showError: false });
//     setField("userID", { value: null, valid: false, showError: false });
//   };

//   const onDoctorSelect = (docId: number) => {
//     setField("userID", { value: docId, valid: true, showError: false });
//   };

//   const togglePhoto = () => {
//     setPhotoUri(curr => (curr ? null : "file:///dummy/photo.jpg"));
//   };

//   // Validation
//   const allValid = useMemo(() => {
//     const required: (keyof FormState)[] = [
//       "pUHID", "dob", "age", "gender", "pName", "title", "phoneNumber",
//       "address", "state", "city", "pinCode", "weight", "height",
//       "insurance", "departmentID", "userID"
//     ];
//     return required.every(k => form[k].valid);
//   }, [form]);

//   const checkValid = useCallback(() => {
//     let ok = true;
//     Object.keys(form).forEach(k => {
//       const key = k as keyof FormState;
//       if (!form[key].valid) {
//         ok = false;
//         setField(key, { showError: true });
//       }
//     });
//     return ok;
//   }, [form, setField]);

//   // Submit
//   const submitNow = useCallback(async () => {
//     if (!user?.id) {
//       Alert.alert("Session", "Missing user session");
//       return;
//     }
//     if (!checkValid()) return;

//     try {
//       const fd = new FormData();
//       fd.append("category", category);
//       fd.append("patientStartStatus", String(patientStartStatus ?? "1"));
//       fd.append("addedBy", String(user.id));

//       if (photoUri) {
//         fd.append("photo", { uri: photoUri, name: "photo.jpg", type: "image/jpeg" } as any);
//       } else {
//         fd.append("photo", "" as any);
//       }

//       (Object.keys(form) as (keyof FormState)[]).forEach(k => {
//         const v = form[k].value;
//         if (form[k].valid && v !== null && v !== "") {
//           fd.append(k, String(v));
//         }
//       });
// console.log(fd, "payload to be sent")
//       const token = await AsyncStorage.getItem('token');
//       const res = await AuthPost(`patient/${user?.hospitalID}/patients`, fd, token);
// console.log(Response, "api response")
//       if (res?.data?.message === "success") {
//         dispatch(showSuccess("Patient registered successfully."));
//         navigation.navigate("PatientsList");
//       } else {
//         dispatch(showError(res?.data?.message || "Failed to save patient."));
//       }
//     } catch (e) {
//       dispatch(showError("Submission failed."));
//       console.error(e);
//     }
//   }, [user, form, category, patientStartStatus, photoUri, dispatch, navigation, checkValid]);

//   const debouncedSubmit = useMemo(() => debounce(submitNow, DEBOUNCE_DELAY), [submitNow]);
//   useEffect(() => () => debouncedSubmit.cancel(), [debouncedSubmit]);

//   const onSave = () => {
//     if (!allValid) checkValid();
//     debouncedSubmit();
//   };

//   return (
//     <View style={styles.safe}>
//       <StatusBar barStyle="dark-content" />
//       <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
//         <ScrollView
//           style={styles.scroll}
//           contentContainerStyle={[styles.content, { paddingBottom: FOOTER_HEIGHT + insets.bottom + 100 }]}
//           showsVerticalScrollIndicator={false}
//           keyboardShouldPersistTaps="handled"
//         >
//           <Text style={styles.title}>
//             {category === "neonate" ? "Neonate Registration" : category === "child" ? "Child Registration" : "Adult Registration"}
//           </Text>
//           <Text style={styles.sub}>Complete the form below to register a new patient</Text>

//           {/* Photo */}
//           <View style={styles.uploadRow}>
//             <TouchableOpacity onPress={togglePhoto} style={styles.photoBox}>
//               {photoUri ? <Image source={{ uri: photoUri }} style={styles.photoImg} /> : <User size={28} color="#6b7280" />}
//             </TouchableOpacity>
//             <View style={{ flex: 1 }}>
//               <TouchableOpacity onPress={togglePhoto} style={styles.uploadBtn}>
//                 <Text style={styles.uploadBtnText}>{photoUri ? "Remove Photo" : "Upload Photo"}</Text>
//               </TouchableOpacity>
//               <Text style={styles.note}>JPG/PNG, Max 5MB</Text>
//             </View>
//           </View>

//           {/* Basic Info */}
//           <Section title="Basic Information">
//             <Row>
//               <Col>
//                 <Label>Title *</Label>
//                 <Dropdown
//                   data={titleList}
//                   value={form.title.value}
//                   onSelect={(val) => setField("title", { value: val, valid: true, showError: false })}
//                 />
//               </Col>
//               <Col>
//                 <Label>Patient Name *</Label>
//                 <Input value={form.pName.value} onChangeText={(t) => onChangeText("pName", t)} placeholder="Full name" />
//                 {form.pName.showError && <Err>Required</Err>}
//               </Col>
//             </Row>

//             <Row>
//               <Col>
//                 <Label>Appointment ID</Label>
//                 <Input value={form.pID.value} editable={false} />
//               </Col>
//               <Col>
//                 <Label>Date of Birth *</Label>
//                 <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.input}>
//                   <Text style={{ color: form.dob.value ? "#111" : "#9ca3af" }}>
//                     {form.dob.value || "YYYY-MM-DD"}
//                   </Text>
//                 </TouchableOpacity>
//                 {showDatePicker && (
//                   <DateTimePicker
//                     value={selectedDate || new Date()}
//                     mode="date"
//                     display={Platform.OS === 'android' ? 'spinner' : 'default'}
//                     maximumDate={new Date()}
//                     minimumDate={new Date(1900, 0, 1)}
//                     onChange={(event, date) => {
//                       setShowDatePicker(Platform.OS === 'ios');
//                       if (date) {
//                         setSelectedDate(date);
//                         const iso = date.toISOString().split("T")[0];
//                         setField("dob", { value: iso, valid: true, showError: false });
//                         updateAgeFromDOB(iso);
//                       }
//                     }}
//                   />
//                 )}
//                 {form.dob.showError && <Err>Required</Err>}
//               </Col>
//             </Row>

//             <Row>
//               <Full>
//                 <Label>UHID *</Label>
//                 <Input
//                   placeholder="####-###-###-####"
//                   value={form.pUHID.value}
//                   onChangeText={(t) => onChangeText("pUHID", t)}
//                   keyboardType="number-pad"
//                 />
//                 {form.pUHID.showError && <Err>{form.pUHID.message}</Err>}
//               </Full>
//             </Row>

//             <Row>
//               <Col>
//                 <Label>Age *</Label>
//                 <Input
//                   value={(form.age.value || "").split(" ")[0]}
//                   onChangeText={(t) => onChangeText("age", t)}
//                   keyboardType="number-pad"
//                 />
//                 {form.age.showError && <Err>{form.age.message}</Err>}
//               </Col>
//               <Col>
//                 <Label>Unit *</Label>
//                 <View style={styles.unitRow}>
//                   <Unit label="days" active={ageUnit === "days"} onPress={() => onUnitChange("days")} />
//                   <Unit label="months" active={ageUnit === "months"} onPress={() => onUnitChange("months")} />
//                   <Unit label="years" active={ageUnit === "years"} onPress={() => onUnitChange("years")} />
//                 </View>
//               </Col>
//             </Row>

//             <Row>
//               <Full>
//                 <Label>Gender *</Label>
//                 <View style={styles.genderRow}>
//   {genderList.map(gender => (
//     <Chip 
//       key={gender.key}
//       label={gender.value} 
//       active={form?.gender?.value === gender?.value} 
//       onPress={() => onGenderSelect(gender.key as 1 | 2 | 3)} 
//     />
//   ))}
// </View>
//                 {form.gender.showError && <Err>Required</Err>}
//               </Full>
//             </Row>

//             <Row>
//               <Col>
//                 <Label>Mobile Number *</Label>
//                 <Input
//                   value={form.phoneNumber.value ?? ""}
//                   onChangeText={(t) => onChangeText("phoneNumber", t)}
//                   keyboardType="number-pad"
//                   placeholder="10 digits"
//                 />
//                 {form.phoneNumber.showError && <Err>Required</Err>}
//               </Col>
//               <Col>
//                 <Label>Email</Label>
//                 <Input
//                   value={form.email.value}
//                   onChangeText={(t) => onChangeText("email", t)}
//                   keyboardType="email-address"
//                 />
//                 {form.email.showError && <Err>Invalid email</Err>}
//               </Col>
//             </Row>
//           </Section>

//           {/* Physical */}
//           <Section title="Physical Measurements">
//             <Row>
//               <Col>
//                 <Label>Weight (kg) *</Label>
//                 <Input
//                   value={form.weight.value?.toString() ?? ""}
//                   onChangeText={(t) => onChangeText("weight", t)}
//                   keyboardType="decimal-pad"
//                 />
//                 {form.weight.showError && <Err>Required</Err>}
//               </Col>
//               <Col>
//                 <Label>Height (cm) *</Label>
//                 <Input
//                   value={form.height.value?.toString() ?? ""}
//                   onChangeText={(t) => onChangeText("height", t)}
//                   keyboardType="decimal-pad"
//                 />
//                 {form.height.showError && <Err>Required</Err>}
//               </Col>
//             </Row>
//           </Section>

//           {/* Address */}
//           <Section title="Address Information">
//             <Row>
//               <Full>
//                 <Label>Complete Address *</Label>
//                 <Input
//                   value={form.address.value}
//                   onChangeText={(t) => onChangeText("address", t)}
//                   multiline
//                   style={{ height: 92 }}
//                 />
//                 {form.address.showError && <Err>Required</Err>}
//               </Full>
//             </Row>
//             <Row>
//               <Col>
//                 <Label>State *</Label>
//                 <Dropdown
//                   data={state}
//                   value={form.state.value}
//                   onSelect={(val) => {
//                     setField("state", { value: val, valid: true, showError: false });
//                     setField("city", { value: "", valid: false, showError: false });
//                   }}
//                 />
//                 {form.state.showError && <Err>Required</Err>}
//               </Col>
//               <Col>
//                 <Label>City *</Label>
//                 <Dropdown
//                   data={cityList.length > 0 ? cityList : ["Select state first"]}
//                   value={form.city.value}
//                   onSelect={(val) => setField("city", { value: val, valid: true, showError: false })}
//                   disabled={!form.state.valid}
//                 />
//                 {form.city.showError && <Err>Required</Err>}
//               </Col>
//             </Row>
//             <Row>
//               <Col>
//                 <Label>PIN Code *</Label>
//                 <Input
//                   value={form.pinCode.value}
//                   onChangeText={(t) => onChangeText("pinCode", t)}
//                   keyboardType="number-pad"
//                 />
//                 {form.pinCode.showError && <Err>Required</Err>}
//               </Col>
//               <Col>
//                 <Label>Referred By</Label>
//                 <Input
//                   value={form.referredBy.value}
//                   onChangeText={(t) => onChangeText("referredBy", t)}
//                 />
//               </Col>
//             </Row>
//           </Section>

//           {/* Medical */}
//           <Section title="Medical Information">
//             <Row>
//               <Col>
//                 <Label>Department *</Label>
//                 <Dropdown
//                   data={departmentList.map(d => d.name)}
//                   value={form.department.value}
//                   onSelect={(val) => {
//                     const dept = departmentList.find(d => d.name === val);
//                     if (dept) onDepartmentSelect(dept.id, dept.name);
//                   }}
//                   disabled={user?.role === 4000}
//                 />
//                 {form.department.showError && <Err>Required</Err>}
//               </Col>
//               <Col>
//                 <Label>Doctor *</Label>
//                 <Dropdown
//                   data={filteredDoctors.map(d => `${d.firstName} ${d.lastName || ""}`.trim())}
//                   value={filteredDoctors.find(d => d.id === form.userID.value)?.firstName || ""}
//                   onSelect={(val) => {
//                     const doc = filteredDoctors.find(d => `${d.firstName} ${d.lastName || ""}`.trim() === val);
//                     if (doc) onDoctorSelect(doc.id);
//                   }}
//                   disabled={user?.role === 4000}
//                 />
//                 {form.userID.showError && <Err>Required</Err>}
//               </Col>
//             </Row>
//             <Row>
//               <Col>
//                 <Label>Insurance *</Label>
//                 <View style={styles.genderRow}>
//                   <Chip label="Yes" active={form.insurance.value === 1} onPress={() => onInsuranceSelect(1)} />
//                   <Chip label="No" active={form.insurance.value === 0} onPress={() => onInsuranceSelect(0)} />
//                 </View>
//               </Col>
//             </Row>
//           </Section>

//           <TouchableOpacity style={[styles.saveBtn, { opacity: allValid ? 1 : 0.6 }]} onPress={onSave} activeOpacity={0.9}>
//             <Text style={styles.saveText}>Save Patient</Text>
//           </TouchableOpacity>
//         </ScrollView>

//         <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
//           <Footer active="addPatient" brandColor="#14b8a6" />
//         </View>
//       </KeyboardAvoidingView>
//     </View>
//   );
// };

// export default AddPatientFormMobile;

// // --- Reusable UI Components ---
// const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
//   <View style={{ marginTop: 18 }}>
//     <Text style={styles.secTitle}>{title}</Text>
//     <View style={{ gap: 12 }}>{children}</View>
//   </View>
// );

// const Row = ({ children }: { children: React.ReactNode }) => <View style={styles.row}>{children}</View>;
// const Col = ({ children }: { children: React.ReactNode }) => <View style={styles.col}>{children}</View>;
// const Full = ({ children }: { children: React.ReactNode }) => <View style={styles.full}>{children}</View>;

// const Label = ({ children }: { children: React.ReactNode }) => <Text style={styles.label}>{children}</Text>;

// const Input: React.FC<React.ComponentProps<typeof TextInput>> = (props) => (
//   <TextInput
//     {...props}
//     placeholderTextColor="#9ca3af"
//     style={[styles.input, props.multiline && { height: 92, textAlignVertical: "top" }, props.style]}
//   />
// );

// const Err = ({ children }: { children: React.ReactNode }) => <Text style={styles.err}>{children}</Text>;

// const Chip: React.FC<{ label: string; active?: boolean; onPress?: () => void }> = ({ label, active, onPress }) => (
//   <TouchableOpacity onPress={onPress} style={[styles.chip, active ? styles.chipActive : styles.chipOutline]}>
//     <Text style={[styles.chipText, active && { color: "#fff" }]}>{label}</Text>
//   </TouchableOpacity>
// );

// const Unit: React.FC<{ label: string; active: boolean; onPress: () => void }> = ({ label, active, onPress }) => (
//   <TouchableOpacity onPress={onPress} style={[styles.unit, active && { backgroundColor: "#14b8a6", borderColor: "#14b8a6" }]}>
//     <Text style={[styles.unitText, active && { color: "#fff" }]}>{label}</Text>
//   </TouchableOpacity>
// );

// // Simple Dropdown (replace with ModalSelector or react-native-picker-select if needed)
// const Dropdown: React.FC<{ data: string[]; value: string; onSelect: (val: string) => void; disabled?: boolean }> = ({ data, value, onSelect, disabled }) => {
//   const [open, setOpen] = useState(false);
//   return (
//     <>
//       <TouchableOpacity
//         onPress={() => !disabled && setOpen(true)}
//         style={[styles.input, disabled && { backgroundColor: "#f3f4f6" }]}
//       >
//         <Text style={{ color: value ? "#111" : "#9ca3af" }}>{value || "Select"}</Text>
//       </TouchableOpacity>
//       {open && (
//         <View style={styles.dropdown}>
//           {data.map((item) => (
//             <TouchableOpacity key={item} style={styles.dropdownItem} onPress={() => { onSelect(item); setOpen(false); }}>
//               <Text>{item}</Text>
//             </TouchableOpacity>
//           ))}
//         </View>
//       )}
//     </>
//   );
// };

// /* ----------------------------- Styles ----------------------------- */
// const styles = StyleSheet.create({
//   safe: { flex: 1, backgroundColor: "#fff" },
//   scroll: { flex: 1 },
//   content: { padding: 16, gap: 14 },
//   title: { fontSize: 20, fontWeight: "700", color: "#111827" },
//   sub: { marginTop: 4, color: "#6b7280", fontSize: 13 },
//   uploadRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 },
//   photoBox: { width: 96, height: 96, borderWidth: 1, borderColor: "#cbd5e1", backgroundColor: "#f9fafb", borderRadius: 10, justifyContent: "center", alignItems: "center" },
//   photoImg: { width: "100%", height: "100%", borderRadius: 10 },
//   uploadBtn: { height: 40, borderRadius: 8, borderWidth: 1, borderColor: "#d1d9e0", paddingHorizontal: 12, justifyContent: "center", backgroundColor: "#fff" },
//   uploadBtnText: { color: "#111827", fontWeight: "600" },
//   note: { marginTop: 6, color: "#6b7280", fontSize: 12 },
//   secTitle: { fontSize: 16, fontWeight: "700", color: "#374151", marginBottom: 6 },
//   row: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
//   col: { flexGrow: 1, flexBasis: (W - 32 - 12) / 2, minWidth: 150 },
//   full: { width: "100%" },
//   label: { color: "#374151", fontWeight: "600", marginBottom: 6 },
//   input: { height: 46, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, paddingHorizontal: 12, backgroundColor: "#fff", justifyContent: "center" },
//   err: { marginTop: 4, color: "#ef4444", fontSize: 12 },
//   unitRow: { flexDirection: "row", gap: 8 },
//   unit: { paddingHorizontal: 12, height: 32, borderRadius: 8, borderWidth: 1, borderColor: "#d1d5db", justifyContent: "center", backgroundColor: "#fff" },
//   unitText: { color: "#6b7280", fontWeight: "700", fontSize: 12 },
//   genderRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 2 },
//   chip: { paddingHorizontal: 14, height: 32, borderRadius: 999, borderWidth: 1, justifyContent: "center" },
//   chipActive: { backgroundColor: "#14b8a6", borderColor: "#14b8a6" },
//   chipOutline: { backgroundColor: "#fff", borderColor: "#d1d5db" },
//   chipText: { fontSize: 13, fontWeight: "700", color: "#6b7280" },
//   saveBtn: { marginTop: 12, height: 48, borderRadius: 12, backgroundColor: "#14b8a6", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 8, elevation: 3 },
//   saveText: { color: "#fff", fontWeight: "700", fontSize: 15 },
//   footerWrap: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "#fff" },
//   dropdown: { backgroundColor: "#fff", borderRadius: 8, borderWidth: 1, borderColor: "#d1d5db", maxHeight: 200, marginTop: 4 },
//   dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: "#eee" },
// });



import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  StyleSheet,
  SafeAreaView,
  useColorScheme,
  PermissionsAndroid,
  Dimensions,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { launchCamera, launchImageLibrary } from "react-native-image-picker";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";

import { AuthFetch, AuthPost, UploadFiles } from "../../auth/auth";
import Footer from "../dashboard/footer";
import { RootState } from "../../store/store";
import { city, state } from "../../utils/stateCity";
import { Category, genderList, getUniqueId } from "../../utils/addPatientFormHelper";
import { Role_NAME } from "../../utils/role";
import {
  validateAgeAndUnit as validateAgeAndUnitUtil,
  ageFromDOB,
  AgeUnit,
} from "../../utils/age";
import {
  patientOPDbasicDetailType,
  staffType,
} from "../../utils/types";

type Department = { id: number; name: string };

const { height } = Dimensions.get("window");

const initialFormState: patientOPDbasicDetailType = {
  hospitalID: { valid: true, value: null, showError: false, message: "" },
  pID: { valid: true, value: "", showError: false, message: "" },
  pUHID: { valid: false, value: null, showError: false, message: "Please enter the UHID number" },
  ptype: { valid: true, value: 1, showError: false, message: "" },
  dob: { valid: true, value: "", showError: false, message: "" },
  gender: { valid: false, value: -1, showError: false, message: "" },
  age: { value: "", valid: false, showError: false, message: "" },
  weight: { valid: false, value: null, showError: false, message: "" },
  height: { valid: false, value: null, showError: false, message: "" },
  pName: { valid: false, value: "", showError: false, message: "" },
  phoneNumber: { valid: false, value: null, showError: false, message: "" },
  email: { valid: true, value: "", showError: false, message: "" },
  address: { valid: false, value: "", showError: false, message: "" },
  city: { valid: false, value: "", showError: false, message: "" },
  state: { valid: false, value: "", showError: false, message: "" },
  pinCode: { valid: false, value: "", showError: false, message: "" },
  referredBy: { valid: true, value: "", showError: false, message: "" },
  departmentID: { valid: false, value: undefined, showError: false, message: "" },
  department: { valid: false, value: "", showError: false, message: "" },
  userID: { valid: false, value: null, showError: false, message: "" },
  wardID: { valid: true, value: null, showError: false, message: "" },
  insurance: { valid: true, value: 0, showError: false, message: "" },
  insuranceNumber: { valid: true, value: "", showError: false, message: "" },
  insuranceCompany: { valid: true, value: "", showError: false, message: "" },
  discount: { valid: true, value: "", showError: false, message: "" },
  reason: { valid: true, value: "", showError: false, message: "" },
  id: { valid: true, value: "", showError: false, message: "" },
};

const AddPatientForm: React.FC = () => {
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const category: Category = (route.params?.category ?? "adult") as Category;

  const user = useSelector((s: RootState) => s.currentUser);

  const [formData, setFormData] = useState<patientOPDbasicDetailType>(initialFormState);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [cityList, setCityList] = useState<string[]>([]);
  const [doctorList, setDoctorList] = useState<staffType[]>([]);
  const [departmentList, setDepartmentList] = useState<Department[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<staffType[]>([]);
  const [selectedDepartmentID, setSelectedDepartmentID] = useState<number | null>(null);
  const [ageUnit, setAgeUnit] = useState<AgeUnit>("years");
  const [title, setTitle] = useState("");
  const [titleList, setTitleList] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [imagePickerModal, setImagePickerModal] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const FOOTER_HEIGHT = 70;

  const isDark = scheme === "dark";

  const COLORS = useMemo(() => ({
    bg: isDark ? "#1e293b" : "#f8fafc",        // Lighter dark bg
    card: isDark ? "#334155" : "#ffffff",      // Card contrast
    text: isDark ? "#f1f5f9" : "#1e293b",
    sub: isDark ? "#cbd5e1" : "#64748b",
    border: isDark ? "#475569" : "#e2e8f0",
    brand: "#14b8a6",
    danger: "#ef4444",
    inputBg: "transparent",
    placeholder: isDark ? "#94a3b8" : "#9ca3af",
    pickerText: isDark ? "#f1f5f9" : "#1e293b",
  }), [isDark]);

  // ---------- Title list by category ----------
  useEffect(() => {
    if (category === "1") {
      setTitleList(["B/O"]);
      setTitle("B/O");
      setAgeUnit("days");
    } else if (category === "2") {
      setTitleList(["Mr.", "Ms."]);
      setTitle("Mr.");
    } else {
      setTitleList(["Mr.", "Mrs.", "Ms."]);
      setTitle("Mr.");
      setAgeUnit("years");
    }
  }, [category]);

  // ---------- Prefill hospitalID / pID / ptype ----------
  useEffect(() => {
    const value = getUniqueId();
    setFormData(prev => ({
      ...prev,
      hospitalID: { value: user?.hospitalID ?? null, valid: !!user?.hospitalID, showError: !user?.hospitalID, message: "" },
      pID: { valid: true, showError: false, value, message: "" },
      ptype: { valid: true, showError: false, value: 1, message: "" },
    }));
  }, [user?.hospitalID]);

  // ---------- Fetch departments & doctors ----------
  const fetchData = useCallback(async () => {
    try {
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      const [deptRes, docRes] = await Promise.all([
        AuthFetch(`department/${user?.hospitalID}`, token),
        AuthFetch(`user/${user?.hospitalID}/list/${Role_NAME.doctor}`, token),
      ]);
      if (deptRes?.status === "success") setDepartmentList(deptRes?.data?.departments || []);
      if (docRes?.status === "success") setDoctorList(docRes?.data?.users || []);
    } catch {
      Alert.alert("Error", "Failed to load data");
    }
  }, [user?.hospitalID, user?.token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ---------- HOD prefill ----------
  useEffect(() => {
    if (user?.role === 4000 && user?.departmentID && departmentList?.length > 0) {
      const dept = departmentList.find((d) => d.id === user.departmentID);
      if (dept) {
        const hodEntry: staffType = {
          id: user?.id,
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          departmentID: user.departmentID,
        };
        const filtered = [hodEntry, ...doctorList.filter((d) => d.departmentID === user.departmentID)];
        setFilteredDoctors(filtered);
        setSelectedDepartmentID(user.departmentID);
        setFormData((prev) => ({
          ...prev,
          department: { value: String(user.departmentID), valid: true, showError: false, message: "" },
          departmentID: { value: user.departmentID, valid: true, showError: false, message: "" },
          userID: { value: user.id, valid: true, showError: false, message: "" },
        }));
      }
    }
  }, [user, departmentList, doctorList]);

  // ---------- Filter doctors by department ----------
  useEffect(() => {
    if (selectedDepartmentID && user?.role !== 4000) {
      setFilteredDoctors(doctorList.filter((d) => d.departmentID === selectedDepartmentID));
    } else if (user?.role !== 4000) {
      setFilteredDoctors(doctorList);
    }
  }, [selectedDepartmentID, doctorList, user?.role]);

  // ---------- Update city list ----------
  useEffect(() => {
    const idx = state.indexOf(formData.state.value || "");
    setCityList(idx >= 0 ? city[idx] : []);
  }, [formData.state.value]);

  // ---------- DOB -> Age ----------
  useEffect(() => {
    if (!selectedDate) return;
    const dobStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;

    setFormData((prev) => ({ ...prev, dob: { ...prev.dob, value: dobStr, valid: true } }));

    const a = ageFromDOB(dobStr);
    let effectiveUnit: AgeUnit = a.unit;
    if (category === "1") effectiveUnit = "days";
    else if (category === "3") effectiveUnit = "years";

    setAgeUnit(effectiveUnit);
    const rule = validateAgeAndUnitUtil(
      category === "1" ? "neonate" : category === "2" ? "child" : "adult",
      a.n,
      effectiveUnit
    );
    setFormData((prev) => ({
      ...prev,
      age: {
        value: `${a.n} ${effectiveUnit}`,
        valid: rule.ok,
        showError: !rule.ok,
        message: rule.ok ? "" : (rule.msg || ""),
      },
    }));
  }, [selectedDate, category]);

  // ---------- Camera Permission ----------
  const requestCameraPermission = async () => {
    if (Platform.OS === "android") {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: "Camera Permission",
            message: "App needs access to your camera to take photos.",
            buttonNeutral: "Ask Me Later",
            buttonNegative: "Cancel",
            buttonPositive: "OK",
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  // ---------- Image Picker ----------
  const pickImage = async (type: "camera" | "gallery") => {
    const hasPermission = type === "camera" ? await requestCameraPermission() : true;
    if (!hasPermission) {
      Alert.alert("Permission Denied", "Camera access is required to take photos.");
      setImagePickerModal(false);
      return;
    }

    const options: any = {
      mediaType: "photo",
      includeBase64: false,
      maxHeight: 800,
      maxWidth: 800,
      quality: 0.8,
    };

    const launcher = type === "camera" ? launchCamera : launchImageLibrary;

    launcher(options, (response: any) => {
      if (response.didCancel) {
        console.log("User cancelled image picker");
      } else if (response.errorCode) {
        Alert.alert("Error", response.errorMessage || "Failed to pick image");
      } else if (response.assets?.[0]?.uri) {
        setProfileImage(response.assets[0].uri);
      }
      setImagePickerModal(false);
    });
  };

  // ---------- Form Validation ----------
  const validateForm = () => {
    let valid = true;
    const updated = { ...formData };

    if (!formData.pUHID.value || String(formData.pUHID.value).replace(/-/g, "").length !== 14) {
      updated.pUHID = { ...updated.pUHID, valid: false, showError: true };
      valid = false;
    }

    (Object.keys(formData) as (keyof patientOPDbasicDetailType)[]).forEach((key) => {
      const field = formData[key];
      if (!field.valid && field.value !== null && field.value !== "") {
        updated[key] = { ...field, showError: true };
        valid = false;
      }
    });

    setFormData(updated);
    return valid;
  };

  // ---------- Submit ----------
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    const fd = new FormData();
    console.log(formData, "complete form data", formData?.age, formData?.department, formData?.ptype)
    const numHospitalID = Number(user?.hospitalID ?? 0);
  const numCategory   = Number(route.params?.category ?? 1);
  const numAddedBy    = Number(user?.id ?? 0);
  const numPtype      = Number(formData.ptype.value ?? 1);
  const numPUHID      = Number(String(formData.pUHID.value || "").replace(/\D/g, ""));
  const numGender     = Number(formData.gender.value);
  const numWeight     = Number(formData.weight.value);
  const numHeight     = Number(formData.height.value);
  const numInsurance  = Number(formData.insurance.value);
  const numDepartment  = Number(formData.department.value);


  fd.append("hospitalID", numHospitalID as any);
  fd.append("category",   numCategory as any);
  fd.append("addedBy",    numAddedBy as any);
  fd.append("ptype",      numPtype as any);
  fd.append("pUHID",      numPUHID as any);
  fd.append("gender",     numGender as any);
  fd.append("weight",     numWeight as any);
  fd.append("height",     numHeight as any);
  fd.append("insurance",  numInsurance as any);
  fd.append("age",  formData.age.value);
  fd.append("department", numDepartment)


    fd.append("patientStartStatus", 1);
    // fd.append("ptype", "1");

    if (profileImage) {
      fd.append("photo", {
        uri: profileImage,
        name: "photo.jpg",
        type: "image/jpeg",
      } as any);
    } else {
      fd.append("photo", "" as any);
    }
  (Object.keys(formData) as (keyof patientOPDbasicDetailType)[]).forEach((k) => {
    if (
      k === "hospitalID" || k === "pUHID" || k === "ptype" || k === "gender" ||
      k === "weight" || k === "height" || k === "insurance" || k === "department" ||
      k === "departmentID" || k === "userID" || k === "age" // handled separately/elsewhere
    ) return;

    const field = formData[k];
    if (field.valid && field.value !== null && field.value !== "") {
      fd.append(String(k), String(field.value));
    }
  });

  // department / doctor (unchanged)
  if (formData.departmentID.valid && formData.departmentID.value != null) {
    fd.append("departmentID", Number(formData.departmentID.value) as any);
  }
  if (formData.userID.value) {
    fd.append("userID", Number(formData.userID.value) as any);
  } else if (user?.id) {
    fd.append("userID", Number(user.id) as any);
  }

    try {
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      console.log(token, "token to be sent", user?.hospitalID, fd)
      const res = await UploadFiles(`patient/${user?.hospitalID}/patients`, fd, token);
      console.log(res, "add patient response")
      if (res?.status === "success") {
        Alert.alert("Success", "Patient registered successfully");
      } else {
        Alert.alert("Error", res?.status || "Failed to save");
      }
    } catch (err: any) {
        console.log(err, "api response add patient")
      Alert.alert("Error", err?.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  // ---------- Custom Picker with Selected Label ----------
  const CustomPicker = ({
    selectedValue,
    onValueChange,
    items,
    placeholder,
    enabled = true,
  }: {
    selectedValue: any;
    onValueChange: (item: any) => void;
    items: { label: string; value: any }[];
    placeholder: string;
    enabled?: boolean;
  }) => {
    const selectedLabel = items.find(i => i.value === selectedValue)?.label || placeholder;

    return (
      <View style={[styles.pickerContainer, { borderColor: COLORS.border, opacity: enabled ? 1 : 0.6 }]}>
        <Picker
          selectedValue={selectedValue}
          onValueChange={onValueChange}
          style={styles.picker}
          dropdownIconColor={COLORS.brand}
          enabled={enabled}
        >
          {items.map(item => (
            <Picker.Item key={item.value} label={item.label} value={item.value} />
          ))}
        </Picker>
        <View style={styles.pickerOverlay}>
          <Text style={[styles.pickerSelectedText, { color: selectedValue ? COLORS.text : COLORS.placeholder }]}>
            {selectedLabel}
          </Text>
        </View>
      </View>
    );
  };

  // ---------- Input Renderer ----------
  const renderInput = (
    label: string,
    name: keyof patientOPDbasicDetailType,
    opts: { multiline?: boolean; keyboardType?: any; maxLength?: number; placeholder?: string } = {}
  ) => {
    const field = formData[name];
    const placeholder = opts.placeholder || `Enter ${label.toLowerCase()}`;

    return (
      <View style={styles.inputBlock}>
        <Text style={[styles.label, { color: COLORS.sub }]}>
          {label} {["pName", "phoneNumber", "address", "state", "city", "pinCode", "pUHID"].includes(name as any) && <Text style={{ color: COLORS.danger }}>*</Text>}
        </Text>
        <TextInput
          style={[
            styles.input,
            { borderColor: COLORS.border, color: COLORS.text },
            field.showError && { borderColor: COLORS.danger },
            opts.multiline && styles.inputMultiline,
          ]}
          placeholder={placeholder}
          placeholderTextColor={COLORS.placeholder}
          value={String(field.value || "")}
          onChangeText={(text) => {
            let formatted = text;
            let valid = true;
            let message = "";

            if (name === "pUHID") {
              const digits = text.replace(/\D/g, "").slice(0, 14);
              const g1 = digits.slice(0, 4);
              const g2 = digits.slice(4, 7);
              const g3 = digits.slice(7, 10);
              const g4 = digits.slice(10, 14);
              formatted = [g1, g2, g3, g4].filter(Boolean).join("-");
              valid = digits.length === 14;
              message = valid ? "" : "UHID must be 14 digits";
            } else if (name === "phoneNumber" || name === "pinCode") {
              formatted = text.replace(/\D/g, "").slice(0, name === "pinCode" ? 6 : 10);
              valid = formatted.length === (name === "pinCode" ? 6 : 10);
            } else if (name === "pName") {
              valid = /^[A-Za-z\s]{0,50}$/.test(text);
            }

            setFormData((prev) => ({
              ...prev,
              [name]: { ...prev[name], value: formatted, valid, showError: !valid && formatted !== "", message },
            }));
          }}
          keyboardType={opts.keyboardType || "default"}
          multiline={opts.multiline}
          maxLength={opts.maxLength}
        />
        {field.showError && <Text style={[styles.errorText, { color: COLORS.danger }]}>{field.message || "Required"}</Text>}
      </View>
    );
  };

  const allowedUnits: AgeUnit[] = useMemo(() => {
    if (category === "1") return ["days"];
    if (category === "3") return ["years"];
    return ["days", "months", "years"];
  }, [category]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: FOOTER_HEIGHT + insets.bottom + 16 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.title, { color: COLORS.text }]}>
            {category === "1" ? "Neonate" : category === "2" ? "Child" : "Adult"} Registration
          </Text>

          {/* Photo Card */}
          <View style={[styles.card, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
            <Text style={[styles.cardTitle, { color: COLORS.text }]}>Patient Photo</Text>
            <View style={styles.photoRow}>
              <TouchableOpacity onPress={() => setImagePickerModal(true)} activeOpacity={0.8}>
                <View style={[styles.photoWrap, { borderColor: COLORS.brand }]}>
                  {profileImage ? (
                    <Image source={{ uri: profileImage }} style={styles.profileImage} />
                  ) : (
                    <View style={styles.placeholderIcon}>
                      <Text style={{ fontSize: 32, color: COLORS.sub }}>+</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, color: COLORS.sub }}>Tap to upload (optional)</Text>
                <Text style={{ fontSize: 11, color: COLORS.sub, marginTop: 2 }}>JPEG/PNG • Max 5MB</Text>
              </View>
            </View>
          </View>

          {/* Identity Card */}
          <View style={[styles.card, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
            <Text style={[styles.cardTitle, { color: COLORS.text }]}>Identity</Text>
            <View style={styles.row}>
              <View style={{ flex: 0.4 }}>
                <Text style={[styles.label, { color: COLORS.sub }]}>Title *</Text>
                <CustomPicker
                  selectedValue={title}
                  onValueChange={setTitle}
                  items={titleList.map(t => ({ label: t, value: t }))}
                  placeholder="Select Title"
                />
              </View>
              <View style={{ flex: 0.6, marginLeft: 8 }}>
                {renderInput("Patient Name", "pName", { placeholder: "Enter full name" })}
              </View>
            </View>
            {renderInput("Patient ID (Auto)", "pID", { placeholder: "Auto-generated" })}
            {renderInput("UHID", "pUHID", { keyboardType: "numeric", maxLength: 18, placeholder: "XXXX-XXX-XXX-XXXX" })}
          </View>

          {/* Demographics */}
          <View style={[styles.card, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
            <Text style={[styles.cardTitle, { color: COLORS.text }]}>Demographics</Text>

            <View style={styles.inputBlock}>
              <Text style={[styles.label, { color: COLORS.sub }]}>Date of Birth *</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(true)} style={[styles.dateButton, { borderColor: COLORS.border }]}>
                <Text style={{ color: selectedDate ? COLORS.text : COLORS.placeholder, fontSize: 15 }}>
                  {selectedDate ? selectedDate.toLocaleDateString() : "Select DOB"}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate || new Date()}
                  mode="date"
                  display={Platform.OS === "android" ? "spinner" : "default"}
                  maximumDate={new Date()}
                  onChange={(e, date) => {
                    setShowDatePicker(false);
                    if (date) setSelectedDate(date);
                  }}
                />
              )}
            </View>

            <View style={styles.row}>
              <View style={{ flex: 0.6 }}>
                {renderInput("Age", "age", { keyboardType: "numeric", placeholder: "Enter age" })}
              </View>
              <View style={{ flex: 0.4, marginLeft: 8 }}>
                <Text style={[styles.label, { color: COLORS.sub }]}>Unit</Text>
                <CustomPicker
                  selectedValue={ageUnit}
                  onValueChange={(u: AgeUnit) => {
                    if (!allowedUnits.includes(u)) return;
                    setAgeUnit(u);
                    const raw = String(formData.age.value || "").split(" ")[0];
                    const n = Number(raw);
                    if (Number.isFinite(n)) {
                      const rule = validateAgeAndUnitUtil(
                        category === "1" ? "neonate" : category === "2" ? "child" : "adult",
                        n,
                        u
                      );
                      setFormData(prev => ({
                        ...prev,
                        age: { value: `${n} ${u}`, valid: rule.ok, showError: !rule.ok, message: rule.msg || "" }
                      }));
                    }
                  }}
                  items={allowedUnits.map(u => ({ label: u[0].toUpperCase() + u.slice(1), value: u }))}
                  placeholder="Unit"
                />
              </View>
            </View>

            <View style={styles.inputBlock}>
              <Text style={[styles.label, { color: COLORS.sub }]}>Gender *</Text>
              <View style={styles.genderRow}>
                {genderList.map((g) => (
                  <TouchableOpacity
                    key={g.key}
                    style={[
                      styles.genderChip,
                      { borderColor: COLORS.border },
                      formData.gender.value === g.key && { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
                    ]}
                    onPress={() =>
                      setFormData((prev) => ({
                        ...prev,
                        gender: { value: g.key, valid: true, showError: false, message: "" },
                      }))
                    }
                  >
                    <Text
                      style={[
                        { color: formData.gender.value === g.key ? "#fff" : COLORS.text, fontWeight: "600" },
                      ]}
                    >
                      {g.value}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.col}>{renderInput("Weight (kg)", "weight", { keyboardType: "numeric", placeholder: "e.g. 65" })}</View>
              <View style={styles.col}>{renderInput("Height (cm)", "height", { keyboardType: "numeric", placeholder: "e.g. 170" })}</View>
            </View>
          </View>

          {/* Contact */}
          <View style={[styles.card, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
            <Text style={[styles.cardTitle, { color: COLORS.text }]}>Contact</Text>
            {renderInput("Mobile Number", "phoneNumber", { keyboardType: "phone-pad", placeholder: "10-digit mobile" })}
            {renderInput("Email ID", "email", { keyboardType: "email-address", placeholder: "example@domain.com" })}
          </View>

          {/* Address */}
          <View style={[styles.card, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
            <Text style={[styles.cardTitle, { color: COLORS.text }]}>Address</Text>
            {renderInput("Complete Address", "address", { multiline: true, placeholder: "House no., street, area" })}

            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={[styles.label, { color: COLORS.sub }]}>State *</Text>
                <CustomPicker
                  selectedValue={formData.state.value}
                  onValueChange={(val) =>
                    setFormData((prev) => ({
                      ...prev,
                      state: { value: val, valid: true, showError: false, message: "" },
                      city: { ...prev.city, value: "", valid: false },
                    }))
                  }
                  items={state.map(s => ({ label: s, value: s }))}
                  placeholder="Select State"
                />
              </View>
              <View style={styles.col}>
                <Text style={[styles.label, { color: COLORS.sub }]}>City *</Text>
                <CustomPicker
                  selectedValue={formData.city.value}
                  onValueChange={(val) =>
                    setFormData((prev) => ({
                      ...prev,
                      city: { value: val, valid: true, showError: false, message: "" },
                    }))
                  }
                  items={cityList.map(c => ({ label: c, value: c }))}
                  placeholder="Select City"
                  enabled={cityList.length > 0}
                />
              </View>
            </View>

            {renderInput("PIN Code", "pinCode", { keyboardType: "numeric", placeholder: "6-digit PIN" })}
          </View>

          {/* Department & Doctor */}
          <View style={[styles.card, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
            <Text style={[styles.cardTitle, { color: COLORS.text }]}>Department & Doctor</Text>
            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={[styles.label, { color: COLORS.sub }]}>Department *</Text>
                <CustomPicker
                  selectedValue={selectedDepartmentID}
                  onValueChange={(id) => {
                    setSelectedDepartmentID(id);
                    setFormData((prev) => ({
                      ...prev,
                      department: { value: String(id ?? ""), valid: true, showError: false, message: "" },
                      departmentID: { value: id, valid: true, showError: false, message: "" },
                    }));
                  }}
                  items={departmentList.map(d => ({ label: d.name, value: d.id }))}
                  placeholder="Select Department"
                  enabled={user?.role !== 4000}
                />
              </View>
              <View style={styles.col}>
                <Text style={[styles.label, { color: COLORS.sub }]}>Doctor *</Text>
                <CustomPicker
                  selectedValue={formData.userID.value}
                  onValueChange={(id) => {
                    const doc = filteredDoctors.find((d) => d.id === id);
                    setFormData((prev) => ({
                      ...prev,
                      userID: { value: id, valid: true, showError: false, message: "" },
                      departmentID: { value: doc?.departmentID || selectedDepartmentID || undefined, valid: true, showError: false, message: "" },
                      department: { value: String(doc?.departmentID || selectedDepartmentID || ""), valid: true, showError: false, message: "" },
                    }));
                  }}
                  items={filteredDoctors.map(d => ({ label: `${d.firstName} ${d.lastName || ""}`, value: d.id }))}
                  placeholder="Select Doctor"
                  enabled={user?.role !== 4000}
                />
              </View>
            </View>
            {renderInput("Referred By", "referredBy", { placeholder: "Doctor or hospital name" })}
          </View>

          {/* Insurance */}
          <View style={[styles.card, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
            <Text style={[styles.cardTitle, { color: COLORS.text }]}>Insurance</Text>
            <View style={styles.inputBlock}>
              <Text style={[styles.label, { color: COLORS.sub }]}>Insurance *</Text>
              <CustomPicker
                selectedValue={formData.insurance.value}
                onValueChange={(val) =>
                  setFormData((prev) => ({
                    ...prev,
                    insurance: { value: val as 0 | 1, valid: true, showError: false, message: "" },
                  }))
                }
                items={[{ label: "No", value: 0 }, { label: "Yes", value: 1 }]}
                placeholder="Select"
              />
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity style={[styles.submitButton, { backgroundColor: COLORS.brand }]} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Save Patient</Text>}
  </TouchableOpacity>
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
          <Footer active={"dashboard"} brandColor={COLORS.brand} />
        </View>
        {insets.bottom > 0 && <View style={[styles.navShield, { height: insets.bottom }]} />}

        {/* Image Picker Modal */}
        <Modal visible={imagePickerModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: COLORS.card }]}>
              <Text style={[styles.modalTitle, { color: COLORS.text }]}>Choose Photo</Text>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: COLORS.brand }]} onPress={() => pickImage("camera")}>
                <Text style={styles.modalButtonText}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: COLORS.brand }]} onPress={() => pickImage("gallery")}>
                <Text style={styles.modalButtonText}>Choose from Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: "#6b7280" }]} onPress={() => setImagePickerModal(false)}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 16, textAlign: "center" },

  card: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", marginBottom: 12 },

  row: { flexDirection: "row", marginHorizontal: -4 },
  col: { flex: 1, paddingHorizontal: 4 },
  inputBlock: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 6 },

  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: "transparent",
  },
  inputMultiline: { minHeight: 90, textAlignVertical: "top", paddingTop: 12 },
  errorText: { fontSize: 12, marginTop: 4 },

  pickerContainer: {
    borderWidth: 1.5,
    borderRadius: 12,
    overflow: "hidden",
    height: 50,
    justifyContent: "center",
    position: "relative",
  },
  picker: {
    height: 50,
    width: "100%",
    opacity: 0,
  },
  pickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  pickerSelectedText: {
    fontSize: 15,
  },

  genderRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 4 },
  genderChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    marginRight: 8,
    marginBottom: 8,
  },

  dateButton: {
    height: 50,
    borderWidth: 1.5,
    borderRadius: 12,
    justifyContent: "center",
    paddingHorizontal: 14,
  },

  photoRow: { flexDirection: "row", alignItems: "center" },
  photoWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2.5,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  profileImage: { width: 84, height: 84, borderRadius: 42 },
  placeholderIcon: { justifyContent: "center", alignItems: "center" },

  submitButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 12,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  submitText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" },
  modalContent: { borderRadius: 16, padding: 24, width: "88%", alignItems: "center" },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 16 },
  modalButton: { padding: 14, borderRadius: 12, width: "100%", alignItems: "center", marginVertical: 6 },
  modalButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    zIndex: 10,
    elevation: 8,
  },
  navShield: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9,
    backgroundColor: "transparent",
  },
});

export default AddPatientForm;