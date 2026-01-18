"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Zap, Wifi, Rocket, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";

const defaultPlans: any[] = [];
const faqs = [
  {
    q: "איך זה עובד במעבר בין מדינות?",
    a: "החבילה מתחברת אוטומטית לרשת המקומית בכל אחת מהמדינות הכלולות. למשל, בנחיתה בברזיל המכשיר יתחבר מיד לרשת המקומית ללא צורך בהגדרות.",
  },
  {
    q: "מה אני צריך לעשות לפני הטיסה?",
    a: 'רק לסרוק את קוד ה-QR שתקבלו למייל. ההפעלה הסופית מתבצעת לבד בנחיתה בחו"ל.',
  },
];

export default function EsimPackageCheckout() {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [selectedPlan, setSelectedPlan] = useState<number | string | null>(
    null,
  );
  const [showModal, setShowModal] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [countries, setCountries] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>(defaultPlans);
  const [isLoadingCountries, setIsLoadingCountries] = useState(true);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const hasAutoSelectedPlan = useRef(false);

  const getCountryCode = (country: any) =>
    String(
      country.iso_code ??
        country.code ??
        country.country_code ??
        country.iso2 ??
        country.iso3 ??
        country.id ??
        country.name ??
        country.hebrew_name ??
        "",
    );

  // PATH + QUERY PARAMS
  const pathParams = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean);
    return {
      country: parts[0] || "",
      data: parts[1] || "",
      packageId: parts[3] || "",
    };
  }, [pathname]);

  const selectedCountryCodes = useMemo(() => {
    const param = searchParams.get("countries") || "";
    console.log("Countries param:", param);
    const codes = param
      .split(",")
      .map((code) => code.trim())
      .filter(Boolean);
    console.log("Selected country codes:", codes);
    return codes;
  }, [searchParams]);

  const popularDataAmount = useMemo(() => {
    const planParam = searchParams.get("plan") || "";
    const match = planParam.match(/(\d+(?:\.\d+)?)/);
    console.log('match', match);
    
    return match ? Number(match[1]) : null;
  }, [searchParams]);

  const selectedCountryList = useMemo(() => {
    if (selectedCountryCodes.length === 0) return [];
    if (countries.length === 0) {
      return selectedCountryCodes.map((code) => ({ code }));
    }
    return selectedCountryCodes
      .map((code) =>
        countries.find((country) => getCountryCode(country) === code),
      )
      .filter(Boolean);
  }, [countries, selectedCountryCodes]);

  const packageTitle = useMemo(() => {
    if (selectedCountryList.length === 1) {
      const country = selectedCountryList[0];
      const countryName = country?.hebrew_name || country?.name;
      return `חבילת eSIM ${countryName}`;
    }
    return "חבילת Multi-Country";
  }, [selectedCountryList]);

  const highestZone = useMemo(() => {
    const zones = selectedCountryList
      .map((country) => Number(country.zone))
      .filter((zone) => Number.isFinite(zone) && zone > 0);
    console.log("Selected countries:", selectedCountryList);
    console.log("Zones:", zones);
    if (zones.length === 0) return null;
    const maxZone = Math.max(...zones);
    console.log("Highest zone:", maxZone);
    return maxZone;
  }, [selectedCountryList]);

//   const networks = useMemo(() => {
//     if (selectedCountryList.length === 0) return [];
//     return selectedCountryList.map((country) => ({
//       country:
//         country.hebrew_name ||
//         country.name ||
//         country.country_name ||
//         getCountryCode(country),
//       flag: country.flag || "",
//       network: country.network || country.operator || country.carrier || "—",
//     }));
//   }, [selectedCountryList]);

const networks = useMemo(() => {
    const eligibleCountries = highestZone
      ? countries.filter((country) => Number(country.zone) <= highestZone)
      : selectedCountryList;
    return eligibleCountries.map((country) => {
      const extractNetworkNamesFromString = (value: string): string[] => {
        const matches: string[] = [];
        const regex = /network_name["']?\s*[:=]\s*["']([^"']+)["']/g;
        let match = regex.exec(value);
        while (match) {
          matches.push(match[1]);
          match = regex.exec(value);
        }
        return matches;
      };

      let networksList = [];
      if (typeof country.networks === "string") {
        try {
          const parsed = JSON.parse(country.networks);
          if (Array.isArray(parsed)) {
            networksList = parsed;
          } else if (parsed && typeof parsed === "object") {
            networksList = [parsed];
          }
        } catch {
          networksList = [];
        }
      } else if (typeof country.network === "string") {
        try {
          const parsed = JSON.parse(country.network);
          if (Array.isArray(parsed)) {
            networksList = parsed;
          } else if (parsed && typeof parsed === "object") {
            networksList = [parsed];
          }
        } catch {
          networksList = [];
        }
      } else if (Array.isArray(country.networks)) {
        networksList = country.networks;
      } else if (Array.isArray(country.network)) {
        networksList = country.network;
      }

      let networkValue = networksList.length > 0
        ? networksList
            .flatMap((net) => {
              if (typeof net === "string") {
                const fromString = extractNetworkNamesFromString(net);
                return fromString.length > 0 ? fromString : [];
              }
              return net?.network_name ? [net.network_name] : [];
            })
            .filter(Boolean)
            .join(" / ")
        : "";

      if (!networkValue && typeof country.networks === "string") {
        const matches = extractNetworkNamesFromString(country.networks);
        if (matches.length > 0) {
          networkValue = matches.join(" / ");
        }
      }

      if (!networkValue && typeof country.network === "string") {
        const matches = extractNetworkNamesFromString(country.network);
        if (matches.length > 0) {
          networkValue = matches.join(" / ");
        }
      }

      if (!networkValue) {
        networkValue = country.operator || country.carrier || "";
      }
      return {
        country: country.hebrew_name || country.name || country.country_name || getCountryCode(country),
        flag: country.flag || "",
        network: networkValue || "—",
      };
    });
  }, [countries, highestZone, selectedCountryList]);

  // FETCH COUNTRIES
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        setIsLoadingCountries(true);
        const res = await fetch("https://app-link.simtlv.co.il/get-countries");
        const data = await res.json();
        const countriesArray = Array.isArray(data)
          ? data
          : Array.isArray(data.data)
            ? data.data
            : [];
        setCountries(countriesArray);
      } catch {
        setCountries([]);
      } finally {
        setIsLoadingCountries(false);
      }
    };
    fetchCountries();
  }, []);

  // FETCH PACKAGES
  useEffect(() => {
    if (!highestZone) {
      console.log("No highestZone, setting default plans");
      return setPlans(defaultPlans);
    }

    const fetchPackages = async () => {
      try {
        setIsLoadingPlans(true);
        console.log("Fetching packages for zone:", highestZone);
        const res = await fetch(
          `https://app-link.simtlv.co.il/get-packages?zone=${highestZone}`,
        );
        const data = await res.json();
        console.log("API response:", data);
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data.data)
            ? data.data
            : [];
        console.log("List from API:", list);
        const mapped = list.map((p) => ({
          id: p.id || crypto.randomUUID(),
          dataAmount: Number(p.data ?? 0),
          data: `${p.data ?? 0} GB`,
          plan_name: p.plan_name || "",
          duration: `${p.days ?? 30} Days`,
          price: Number(p.price ?? 0),
          popular: popularDataAmount
            ? Number(p.data) === popularDataAmount
            : Number(p.data) === 5,
        }));
        console.log("Mapped plans:", mapped);
        mapped.sort((a, b) => a.price - b.price);
        setPlans(mapped.length > 0 ? mapped : defaultPlans);
        console.log(
          "Final plans set:",
          mapped.length > 0 ? mapped : defaultPlans,
        );
      } catch (error) {
        console.error("Error fetching packages:", error);
        setPlans(defaultPlans);
      } finally {
        setIsLoadingPlans(false);
      }
    };

    fetchPackages();
  }, [highestZone, popularDataAmount]);

  // AUTO-SELECT PLAN
  useEffect(() => {
    if (plans.length === 0 || hasAutoSelectedPlan.current) return;

    const hasSelected = plans.some((plan) => plan.id === selectedPlan);
    if (popularDataAmount) {
      const matchedPlan = plans.find(
        (plan) => plan.dataAmount === popularDataAmount,
      );
      if (matchedPlan && (!hasSelected || selectedPlan !== matchedPlan.id)) {
        setSelectedPlan(matchedPlan.id);
      }
      hasAutoSelectedPlan.current = true;
      return;
    }

    if (!hasSelected) {
      setSelectedPlan(plans[0].id);
    }
    hasAutoSelectedPlan.current = true;
  }, [plans, popularDataAmount, selectedPlan]);

  const currentPrice = plans.find((p) => p.id === selectedPlan)?.price || 0;

  // CHECKOUT
  const handleCheckout = async () => {
    const selectedPlanData = plans.find((plan) => plan.id === selectedPlan);
    if (!selectedPlanData) return;

    const countriesParam = selectedCountryCodes
      .map(encodeURIComponent)
      .join(",");
    const packageId = encodeURIComponent(String(selectedPlanData.id));
    const planParam = selectedPlanData.dataAmount;

    // redirect to Next.js checkout route
    window.location.href = `/esim/checkout?packageId=${packageId}&countries=${countriesParam}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-32" dir="rtl">
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

      <div className="bg-white rounded-b-[30px] shadow-sm px-5 pt-10 pb-4 mb-8 text-center">
        {/* Country Flags */}
        <div className="flex justify-center items-center mb-4 h-16 relative">
          {isLoadingCountries && selectedCountryList.length === 0
            ? [0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-14 h-14 rounded-full border-4 border-white bg-gray-200 animate-pulse relative z-10 -ml-4"
                />
              ))
            : selectedCountryList.map((c, i) => (
                <div
                  key={c.code ?? i}
                  className="w-14 h-14 rounded-full border-4 border-white bg-gray-100 flex items-center justify-center text-3xl shadow-md -ml-4"
                >
                  {c.flag ?? "🌐"}
                </div>
              ))}
        </div>

        <h1 className="text-3xl font-bold mb-3 text-gray-900">
          {packageTitle}
        </h1>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-sm font-bold border border-blue-200 hover:bg-blue-100 transition"
        >
          📶 כיסוי ב-{networks.length} יעדים נבחרים ›
        </button>

        {/* Tech Specs */}
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-4 mt-6 shadow-sm">
          <div className="flex-1 flex flex-col items-center relative">
            <Zap className="text-purple-600 mb-1" size={20} strokeWidth={2.5} />
            <div className="text-xs text-gray-600 uppercase font-medium">
              מהירות
            </div>
            <div className="text-sm font-black">5G / 4G</div>
            <div className="absolute left-0 top-[10%] h-[80%] w-px bg-gray-200" />
          </div>
          <div className="flex-1 flex flex-col items-center relative">
            <Wifi
              className="text-purple-600 mb-1"
              size={20}
              strokeWidth={2.5}
            />
            <div className="text-xs text-gray-600 uppercase font-medium">
              Hotspot
            </div>
            <div className="text-sm font-black">כלול</div>
            <div className="absolute left-0 top-[10%] h-[80%] w-px bg-gray-200" />
          </div>
          <div className="flex-1 flex flex-col items-center">
            <Rocket
              className="text-purple-600 mb-1"
              size={20}
              strokeWidth={2.5}
            />
            <div className="text-xs text-gray-600 uppercase font-medium">
              הפעלה
            </div>
            <div className="text-sm font-black">מיידית</div>
          </div>
        </div>
      </div>

      {/* Plans */}
      <div className="max-w-[600px] mx-auto px-5">
        {/* Plans Section */}
        <h2 className="text-lg font-black mb-4 text-gray-900">בחר חבילה משולבת:</h2>

        <div className="space-y-3">
          {isLoadingPlans
            ? [0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="relative flex items-center justify-between p-5 rounded-2xl bg-white border-2 border-transparent shadow-sm animate-pulse"
                >
                  <div className="flex items-center gap-4 w-full">
                    <div className="w-6 h-6 rounded-full bg-gray-200" />
                    <div className="flex-1">
                      <div className="h-6 w-24 bg-gray-200 rounded-md mb-2" />
                      <div className="h-4 w-16 bg-gray-200 rounded-md" />
                    </div>
                  </div>
                  <div className="h-6 w-16 bg-gray-200 rounded-md" />
                </div>
              ))
            : plans.map((plan) => (
            <div
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className={`relative flex items-center justify-between p-5 rounded-2xl cursor-pointer transition-all ${
                selectedPlan === plan.id
                  ? 'bg-purple-50 border-2 border-purple-600 shadow-lg scale-[1.02]'
                  : 'bg-white border-2 border-transparent shadow-sm hover:border-purple-200'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 right-5 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                  הכי משתלם
                </div>
              )}

              <div className="flex items-center gap-4">
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${
                    selectedPlan === plan.id
                      ? 'bg-purple-600 border-purple-600'
                      : 'border-gray-300'
                  }`}
                >
                  {selectedPlan === plan.id && (
                    <div className="w-1.5 h-2.5 border-white border-r-2 border-b-2 transform rotate-45 mb-0.5" />
                  )}
                </div>
                <div>
                  <div className="text-2xl font-black text-gray-900" dir="ltr">{plan.data}</div>
                  <div className="text-sm text-gray-600 font-medium"  dir="ltr">{plan.duration}</div>
                </div>
              </div>

              <div className="text-2xl font-black text-purple-600">${plan.price.toFixed(2)}</div>
            </div>
          ))}
        </div>

      </div>

      {/* FAQ */}
      <div className="max-w-[600px] mx-auto px-5 mt-6 space-y-3">
        {faqs.map((faq, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
          >
            <div
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              className="flex items-center justify-between p-5 cursor-pointer font-bold text-gray-900"
            >
              <span>{faq.q}</span>
              <span
                className={`text-2xl text-purple-600 ${openFaq === i ? "rotate-45" : ""}`}
              >
                +
              </span>
            </div>
            {openFaq === i && (
              <div className="px-5 pb-5 text-sm text-gray-600">{faq.a}</div>
            )}
          </div>
        ))}
      </div>

      {/* Sticky Footer */}
      <div className="fixed bottom-5 left-0 right-0 flex justify-center z-50 pointer-events-none">
        <div className="pointer-events-auto bg-white w-[90%] max-w-md p-2 rounded-2xl shadow-2xl flex items-center justify-between border border-gray-100">
          <div>
            <div className="text-xs text-gray-600 font-semibold uppercase">
              סה"כ לתשלום
            </div>
            <div className="text-2xl font-black text-gray-900">
              ${currentPrice.toFixed(2)}
            </div>
          </div>
          <button
            onClick={handleCheckout}
            className="bg-gradient-to-br from-purple-600 to-purple-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl active:scale-95 transition"
          >
            רכישה מיידית ←
          </button>
        </div>
      </div>

      {/* Networks Modal */}
      {showModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-end justify-center animate-fadeIn"
        >
          <div
            className="bg-white w-full max-w-2xl rounded-t-3xl p-8 max-h-[80vh] overflow-y-auto animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-black text-gray-900">יעדים ורשתות נתמכות</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X size={28} />
              </button>
            </div>

            <div className="bg-slate-100 text-sm text-gray-700 p-3 rounded-xl mb-5">
              💡 חבילה זו כוללת גלישה חופשית ב- {networks.length} יעדים. המעבר ביניהם אוטומטי.
            </div>

            <div className="space-y-0">
              {networks.map((net, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0"
                >
                  <div className="flex items-center gap-3 font-bold">
                    <span className="text-2xl">{net.flag}</span>
                    {net.country}
                  </div>
                  <div className="bg-slate-50 text-sm text-gray-600 px-3 py-1 rounded-lg border border-gray-200">
                    {net.network}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
