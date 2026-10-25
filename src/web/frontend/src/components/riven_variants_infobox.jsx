import Infobox from "./infobox";

export default function RivenVariantsInfobox({ rivenModInfo, header }) {
  const weaponInfo = rivenModInfo.familyUnames.map(uname => {
    const weaponName = rivenModInfo.weaponNameMap[uname] || uname;
    const disposition = rivenModInfo.retiredDispositionMap[uname] || 1.2;
    return { uname, weaponName, disposition };
  });

  const content = <div className="text-white font-mono min-w-max whitespace-nowrap">
      <h2 className="text-lg font-semibold">Variants for {rivenModInfo.weaponName}</h2>
      <div >
        {weaponInfo.map(info => (
          <p><b className="text-yellow-400">{info.weaponName}</b>: {info.disposition?.toFixed(2) || 'N/A'}x</p>
        ))}
      </div>
    </div>;
  
  return <Infobox header={header} content={content} />;
}