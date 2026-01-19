import { notFound } from "next/navigation";
import EsimPackageClient from "./EsimPackage";

type SearchParams = {
  countries?: string;
  plan?: string;
};

type Props = {
  searchParams: Promise<SearchParams>;
};

async function getProductSSR(countries: string, plan: string) {
  try {
    type Country = {
      iso_code: string;
      zone: number;
      hebrew_name?: string;
      flag?: string;
    };

    // Fetch zone for countries
    const countriesRes = await fetch('https://app-link.simtlv.co.il/get-countries');
    const countriesData = await countriesRes.json();
    const countriesArray: Country[] =
      Array.isArray(countriesData)
        ? countriesData
        : Array.isArray(countriesData.data)
        ? countriesData.data
        : [];
    
    // Find highest zone for selected countries
    const selectedCountries = countries.split(',');
    const countryObjects = countriesArray.filter((c: Country) => 
      selectedCountries.includes(c.iso_code)
    );
    if (countryObjects.length === 0) return null;
    const highestZone = Math.max(...countryObjects.map((c: Country) => c.zone));
    
    // Fetch packages for that zone
    const packagesRes = await fetch(
      `https://app-link.simtlv.co.il/get-packages?zone=${highestZone}`
    );
    const packagesData = await packagesRes.json();
    const packages: { data: number; price: string | number; days: number }[] =
      Array.isArray(packagesData)
        ? packagesData
        : Array.isArray(packagesData.data)
        ? packagesData.data
        : [];
    
    // Find matching plan
    const planMatch = plan.match(/(\d+)/);
    const dataAmount = planMatch ? Number(planMatch[1]) : null;
    const selectedPackage = packages.find(p => p.data === dataAmount);
    
    if (!selectedPackage) return null;

    const countryName =
      countryObjects[0].hebrew_name || countryObjects[0].iso_code || "Country";
    const imageUrl =
      countryObjects[0].flag && /^https?:\/\//.test(countryObjects[0].flag)
        ? countryObjects[0].flag
        : "https://app.simtlv.co.il/images/esim-default.jpg";

    return {
      title: `eSIM ${countryName} - ${selectedPackage.data}GB`,
      price: Number(selectedPackage.price),
      currency: "ILS",
      sku: `${countries}-${selectedPackage.data}GB`,
      image: imageUrl,
      description: `${selectedPackage.data}GB data for ${selectedPackage.days} days`,
    };
  } catch (error) {
    console.error('SSR fetch error:', error);
    return null;
  }
}

export default async function PackagePage({ searchParams }: Props) {
  const { countries, plan } = await searchParams;
  if (!countries || !plan) notFound();

  const product = await getProductSSR(countries, plan);
  if (!product) notFound();
  const pageUrl = `https://app.simtlv.co.il/esim/package?countries=${encodeURIComponent(
    countries
  )}&plan=${encodeURIComponent(plan)}`;

  return (
    <>

      <meta property="og:title" content={product.title} />
      <meta property="og:type" content="product" />
      <meta property="og:price:amount" content={product.price.toString()} />
      <meta property="og:price:currency" content={product.currency} />


    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org/",
          "@type": "Product",
          name: product.title,
          sku: product.sku,
          image: [product.image],
          description: product.description,
          brand: {
            "@type": "Brand",
            name: "SimTLV"
          },
          offers: {
            "@type": "Offer",
            url: pageUrl,
            price: product.price.toFixed(2),
            priceCurrency: product.currency,
            availability: "https://schema.org/InStock",
            itemCondition: "https://schema.org/NewCondition",
            priceValidUntil: "2026-12-31",
            seller: {
              "@type": "Organization",
              name: "SimTLV"
            }
          }
        })
      }}
    />

      {/* ✅ CLIENT UI */}
      {(() => {
        const Client: any = EsimPackageClient;
        return (
          <Client
            countriesParam={countries}
            planParam={plan}
            ssrPrice={product.price}
          />
        );
      })()}
    </>
  );
}
