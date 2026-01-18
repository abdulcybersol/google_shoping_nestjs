"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
// import Footer from "@/components/Footer";

export default function CheckoutPage() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selectedPayment, setSelectedPayment] = useState("cc");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [showCountriesModal, setShowCountriesModal] = useState(false);

  type Customer = { name: string; email: string; phone: string; };
  const [countryList, setCountryList] = useState<any[]>([]);
  const [packageInfo, setPackageInfo] = useState<any>({});
  const [customers, setCustomers] = useState<Customer[]>([{ name: "", email: "", phone: "" }]);

   const handleAddCustomer = () => {
    setCustomers((prev) => [...prev, { name: '', email: '', phone: '' }]);
  };

  /* -------------------------------- utils -------------------------------- */

  const getCountryCode = (country: any) =>
    String(
      country.iso_code ??
        country.code ??
        country.country_code ??
        country.iso2 ??
        country.iso3 ??
        country.id ??
        country.name ??
        ""
    );

  /* --------------------------- path params parsing -------------------------- */

  const pathParams = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean);

    // example: /GR/1gb/esim/12
    if (parts.length >= 4 && parts[2].toLowerCase() === "esim") {
      return {
        country: decodeURIComponent(parts[0]),
        data: parts[1],
        packageId: parts[3],
      };
    }

    return { country: "", data: "", packageId: "" };
  }, [pathname]);

  /* --------------------------- query + countries ---------------------------- */

  const countryCodes = useMemo(() => {
    const countries = searchParams.get("countries") || "";

    if (countries) {
      return countries.split(",").map((c) => c.trim());
    }

    return pathParams.country
      ? pathParams.country.split(",").map((c) => c.trim())
      : [];
  }, [searchParams, pathParams]);

  const flags = useMemo(() => {
    return countryCodes
      .map(
        (code) =>
          countryList.find((c) => getCountryCode(c) === code)?.flag
      )
      .filter(Boolean)
      .join(" ");
  }, [countryCodes, countryList]);

  const selectedCountries = useMemo(() => {
    return countryCodes.map((code) => {
      const c = countryList.find((x) => getCountryCode(x) === code) || {};
      return {
        code,
        flag: c.flag || code,
        name: c.hebrew_name || c.country_name || c.name || code,
      };
    });
  }, [countryCodes, countryList]);

  /* ------------------------------ product ---------------------------------- */

  const product = useMemo(() => {
    const price = Number(searchParams.get("price") || 0);

    return {
      name:
        packageInfo?.name ||
        searchParams.get("name") ||
        "eSIM Package",
      data: packageInfo?.data || pathParams.data,
      details:
        packageInfo?.duration || searchParams.get("duration") || "",
      flags,
      price: packageInfo?.price ?? price,
    };
  }, [packageInfo, flags, searchParams, pathParams]);

  /* ------------------------------ fetch data -------------------------------- */

  useEffect(() => {
    fetch("https://app-link.simtlv.co.il/get-countries")
      .then((r) => r.json())
      .then((d) => setCountryList(Array.isArray(d) ? d : d.data || []))
      .catch(() => setCountryList([]));
  }, []);

  useEffect(() => {
    const packageId =
      searchParams.get("packageId") || pathParams.packageId;

    if (!packageId || !countryList.length) return;

    const zones = countryCodes
      .map(
        (code) =>
          countryList.find((c) => getCountryCode(c) === code)?.zone
      )
      .filter(Boolean);

    if (!zones.length) return;

    const zone = Math.max(...zones);

    fetch(`https://app-link.simtlv.co.il/get-packages?zone=${zone}`)
      .then((r) => r.json())
      .then((d) => {
        const list = d?.data || d;
        const pkg = list.find(
          (p: any) => String(p.id) === String(packageId)
        );
        if (!pkg) return;

        setPackageInfo({
          name: pkg.plan_name,
          data: pkg.data,
          duration: `${pkg.days} Days`,
          price: Number(pkg.price),
        });
      });
  }, [countryCodes, countryList, searchParams, pathParams]);

  /* ------------------------------ handlers --------------------------------- */

  const totalAmount = product.price * customers.length;

  const handleInputChange = (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCustomers((prev) => {
      const next = [...prev];
      const key = name as keyof Customer;
      next[i] = { ...next[i], [key]: value };
      return next;
    });
  };

  const handlePayment = async () => {
    if (!hasAcceptedTerms) {
      setError("Please accept the terms.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    // your payment logic stays identical
  };

  /* -------------------------------- render --------------------------------- */

  return (
    <>
      <div className="min-h-screen bg-slate-50 pb-40" dir="rtl">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 py-3">
              <div className="max-w-6xl mx-auto px-5 flex items-center justify-between">
                <Link href="/">
                                          <div className="bg-simtlv-purple/10 backdrop-blur-sm p-2 rounded-lg border border-simtlv-purple/20 shadow-lg shadow-simtlv-purple/10">
                                            <img
                                              src="/lovable-uploads/76c222a9-2179-437b-b0e9-a23989104e88.png"
                                              alt="SimTLV Logo"
                                              className="h-8 w-auto filter brightness-110"
                                            />
                                          </div>
                            </Link>
                <div className="bg-emerald-50 text-emerald-800 text-sm font-bold px-4 py-2 rounded-full border border-emerald-200 flex items-center gap-2">
                  👥 הצטרפו ל-100,000+ לקוחות
                </div>
              </div>
            </header>

        <div className="max-w-2xl mx-auto px-5">
          {/* Summary Card */}
          <div className="bg-white rounded-2xl p-5 mt-5 shadow-sm border border-gray-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-3xl">
                {selectedCountries.slice(0, 3).map((country) => (
                  <span key={country.code}>{country.flag}</span>
                ))}
                {selectedCountries.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setShowCountriesModal(true)}
                    className="text-sm font-bold text-purple-600 hover:text-purple-700"
                  >
                    +{selectedCountries.length - 3}
                  </button>
                )}
              </div>
              <div>
                <div className="font-black text-base">{product.name}</div>
                <div className="text-sm text-gray-600 text-right" dir="ltr">{product.data} GB ·  {product.details}</div>
              </div>
            </div>
            <div className="flex flex-col items-end text-right leading-tight">
            <div className="text-lg font-black text-purple-600">${totalAmount.toFixed(2)}</div>
             {customers.length > 1 && (
                <div className="inline-flex items-center gap-1 bg-purple-100 px-2 py-1 rounded-full text-sm text-purple-700" dir="ltr">
                  <span className="font-medium" dir="rtl">{customers.length} יחידות</span>
                  <span>×</span>
                  <span className="font-semibold">${product.price.toFixed(2)}</span>
                </div>
              )}
              </div>
          </div>

          <div className="flex items-center justify-center mt-4 mb-2">
            <button
              type="button"
              onClick={handleAddCustomer}
              className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-bold text-purple-700 hover:bg-purple-100 transition"
            >
                                  הוספת eSIM נוסף
            </button>
          </div>
          {/* Contact Form */}
          <h2 className="text-base font-black mb-3 text-gray-900">פרטי מקבל ה-eSIM</h2>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="space-y-5">
              {customers.map((customer, index) => (
                <div key={index} className="space-y-4 border-b border-gray-100 pb-5 last:border-0 last:pb-0">
                  {/* <div className="text-sm font-bold text-gray-700">
                    xx`x" {index + 1}
                  </div> */}
                  <div>
                    <label className="block text-sm font-bold mb-2">שם מלא</label>
                    <input
                      type="text"
                      name="name"
                      value={customer.name}
                      onChange={(e) => handleInputChange(index, e)}
                      placeholder="ישראל ישראלי"
                      className="w-full px-4 py-4 border border-gray-200 rounded-2xl bg-slate-50 focus:outline-none focus:border-purple-600 focus:bg-white transition text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">אימייל (לשליחת ה-QR)</label>
                    <input
                      type="email"
                      name="email"
                      value={customer.email}
                      onChange={(e) => handleInputChange(index, e)}
                      placeholder="email@example.com"
                      className="w-full px-4 py-4 rounded-2xl border border-gray-200 bg-slate-50 focus:outline-none focus:border-purple-600 focus:bg-white transition text-base"
                    />
                  </div>
                  {index === 0 && (
                    <div>
                    <label className="block text-sm font-bold mb-2">טלפון נייד</label>
                      <input
                        type="tel"
                        name="phone"
                        value={customer.phone}
                        onChange={(e) => handleInputChange(index, e)}
                        placeholder="050-1234567"
                        className="w-full px-4 py-4 border border-gray-200 rounded-2xl bg-slate-50 focus:outline-none focus:border-purple-600 focus:bg-white transition text-base"
                      />
                    </div>
                  )}

                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const updated = customers.filter((_, i) => i !== index);
                        setCustomers(updated);
                      }}
                      className="inline-flex items-center gap-2 self-start rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-600 shadow-sm hover:bg-red-50 hover:border-red-300 transition"
                    >
                      {/* <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-700 text-base leading-none">x</span> */}
                                              להסיר

                    </button>
                  )}
                </div>
              ))}

            </div>
            <div className="mt-4 space-y-3">
              {/* <div className="rounded-2xl border border-gray-200 bg-slate-50 p-4">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasConfirmedDevice}
                    onChange={(e) => setHasConfirmedDevice(e.target.checked)}
                    className="sr-only"
                  />
                  {hasConfirmedDevice ? (
                    <CheckCircle className="text-purple-500" size={18} />
                  ) : (
                    <Circle className="text-purple-500" size={18} />
                  )}
                  <span className="font-bold text-gray-900">בדוק אם המכשיר שלך תומך ב‑eSIM</span>
                </label>
                <div className="mt-2 text-xs text-gray-600 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setShowDeviceModal(true)}
                    className="text-purple-600 font-semibold hover:text-purple-700 underline"
                  >
                    Check here
                  </button>
                </div>
              </div> */}
              <label className="flex items-start gap-3 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={hasAcceptedTerms}
                  onChange={(e) => setHasAcceptedTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span>
                  אני מסכים לתנאי השימוש ואישרתי שהמכשיר שלי תומך ב‑eSIM.
                  {/* <Link to="/terms-and-usage" className="text-purple-600 font-semibold hover:text-purple-700 underline">
                    Terms of Use
                  </Link> */}
                </span>
              </label>
            </div>
          <button
            onClick={handlePayment}
            disabled={isSubmitting}
            className={`w-full py-4 mt-6 rounded-2xl text-lg font-black text-white shadow-lg active:scale-98 transition-all flex items-center justify-center gap-3 ${
              selectedPayment === 'bit'
                ? 'bg-gradient-to-br from-[#00AEEF] to-[#0095CC] shadow-[#00AEEF]/30'
                : 'bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 shadow-purple-700/30 hover:brightness-105'
            }`}
          >
              {isSubmitting ? "Processing payment..." : "Continue to secure payment >"}
            </button>
            {error && (
              <div className="text-sm text-red-600 text-center mt-3">{error}</div>
            )}
          </div>

        </div>
          
      </div>
      {showCountriesModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-lg w-11/12 max-w-md p-6 text-right">
            <h2 className="text-2xl font-bold mb-4 text-center">מדינות שנבחרו</h2>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {selectedCountries.map((country, i) => (
                <div key={`${country.code}-${i}`} className="flex justify-between items-center border-b pb-2">
                  <span>{country.flag}</span>
                  <span>{country.name}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowCountriesModal(false)}
              className="mt-6 w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              סגור
            </button>
          </div>
        </div>
      )}
      {/* <Footer /> */}
    </>
  );
}
