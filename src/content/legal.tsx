/** Application information and terms of use (shown in "Informations & CGU" and on the sign-in page). */
import React from 'react';

export const APP_INFO = {
  name: 'Parking Manager Madagascar',
  shortName: 'Parking Mada',
  version: '1.4.2',
  creatorName: 'Andrianirina Hariniaina Samuel',
  creatorEmail: 'hariniainasamuelandrianirina@gmail.com',
  creatorPhone: '034 21 890 51',
  /** Same number, international format for tel: links */
  creatorPhoneIntl: '+261342189051',
  cguUpdatedOn: '18 novembre 2026'
};

/** Sections of the general terms of use: [title, paragraphs]. */
export const CGU_SECTIONS: { title: string; body: string[] }[] = [
  {
    title: '1. Objet',
    body: [
      `Les présentes conditions générales d'utilisation (« CGU ») encadrent l'accès et l'utilisation de l'application ${APP_INFO.name} (« l'Application »), outil de gestion multi-sites de parkings : membres, véhicules, emplacements, encaissements, trésorerie, dépenses, paie, personnel, matériel, incidents et rapports.`,
      `Toute connexion à l'Application vaut acceptation pleine et entière des présentes CGU. L'utilisateur qui ne les accepte pas doit s'abstenir d'utiliser l'Application.`
    ]
  },
  {
    title: "2. Créateur de l'Application",
    body: [
      `L'Application a été conçue et développée par ${APP_INFO.creatorName}, joignable à l'adresse ${APP_INFO.creatorEmail} ou au ${APP_INFO.creatorPhone}.`,
      `L'organisation qui exploite l'Application (l'« Exploitant ») est responsable de son utilisation, des comptes qu'elle attribue et des données qu'elle y enregistre.`
    ]
  },
  {
    title: '3. Accès au service',
    body: [
      `L'Application est réservée aux personnes disposant d'un compte attribué par l'Exploitant (administrateurs, trésoriers, présidents de site, secrétariat, chefs de poste…). L'accès se fait au moyen d'une adresse email et d'un mot de passe personnels.`,
      `L'Exploitant peut suspendre ou supprimer un compte à tout moment, notamment en cas de départ de l'utilisateur ou de non-respect des présentes CGU.`
    ]
  },
  {
    title: '4. Compte utilisateur et sécurité',
    body: [
      `Les identifiants sont strictement personnels et confidentiels. L'utilisateur s'engage à ne pas les communiquer, à choisir un mot de passe robuste et à le modifier dès la première connexion ainsi qu'en cas de doute sur sa confidentialité.`,
      `Toute action réalisée avec un compte est réputée effectuée par son titulaire. Les opérations sensibles (connexions, encaissements, approbations, suppressions, modifications de paie…) sont tracées dans le journal d'audit, avec la date, l'heure, l'utilisateur et son adresse IP.`,
      `Après plusieurs tentatives de connexion infructueuses, l'accès est temporairement bloqué. L'utilisateur doit signaler sans délai à l'Exploitant toute utilisation non autorisée de son compte.`
    ]
  },
  {
    title: "5. Obligations de l'utilisateur",
    body: [
      `L'utilisateur s'engage à utiliser l'Application conformément à sa finalité professionnelle, à saisir des informations exactes et à jour, et à respecter la réglementation en vigueur, notamment en matière comptable, fiscale et sociale.`,
      `Il est interdit de tenter d'accéder à des données ou fonctions non autorisées, de perturber le fonctionnement de l'Application, d'en extraire massivement les données à des fins étrangères à l'exploitation des parkings, ou d'y introduire des contenus illicites.`
    ]
  },
  {
    title: '6. Données personnelles',
    body: [
      `L'Application enregistre des données à caractère personnel (noms, numéros de CIN, téléphones, adresses, photos, immatriculations, salaires…) pour les seuls besoins de la gestion des parkings. L'Exploitant, responsable du traitement, s'engage à les traiter conformément à la législation malgache relative à la protection des données à caractère personnel (loi n° 2014-038).`,
      `Les personnes concernées disposent d'un droit d'accès, de rectification et de suppression de leurs données, qu'elles exercent auprès de l'Exploitant. Les données ne sont conservées que le temps nécessaire à la gestion et aux obligations légales.`,
      `L'Application utilise uniquement un cookie technique de session, indispensable à la connexion ; aucun cookie publicitaire ni de mesure d'audience n'est déposé.`
    ]
  },
  {
    title: '7. Confidentialité',
    body: [
      `Les informations consultées dans l'Application (données des membres, finances, paie, sécurité des sites) sont confidentielles. L'utilisateur s'interdit de les divulguer à des tiers non autorisés, y compris après la fin de ses fonctions.`
    ]
  },
  {
    title: '8. Disponibilité du service',
    body: [
      `L'Application est accessible en principe 24 h/24 et 7 j/7, sous réserve des opérations de maintenance, des mises à jour et des interruptions indépendantes de la volonté du créateur ou de l'Exploitant (panne d'hébergeur, coupure réseau ou d'électricité…).`,
      `Aucune garantie de disponibilité continue n'est donnée. Il appartient à l'Exploitant d'effectuer des sauvegardes régulières de ses données et de ses exports.`
    ]
  },
  {
    title: '9. Responsabilité',
    body: [
      `L'Application est un outil d'aide à la gestion. Les calculs proposés (retenues sociales et fiscales, rapports, statistiques…) sont indicatifs et doivent être vérifiés par l'Exploitant ; ils ne remplacent pas les obligations déclaratives ni l'avis d'un professionnel.`,
      `La responsabilité du créateur ne saurait être engagée en cas de mauvaise utilisation, d'erreur de saisie, de perte de données due à un défaut de sauvegarde, ou de dommage indirect résultant de l'utilisation de l'Application.`
    ]
  },
  {
    title: '10. Propriété intellectuelle',
    body: [
      `L'Application, son code, sa conception graphique et ses contenus sont protégés par le droit de la propriété intellectuelle et restent la propriété de leur auteur, ${APP_INFO.creatorName}, sauf mention contraire. Les données saisies restent la propriété de l'Exploitant.`
    ]
  },
  {
    title: '11. Modification des CGU',
    body: [
      `Les présentes CGU peuvent être modifiées à tout moment, notamment pour tenir compte des évolutions de l'Application ou de la réglementation. La version en vigueur est celle affichée dans l'Application, avec sa date de mise à jour.`
    ]
  },
  {
    title: '12. Droit applicable et litiges',
    body: [
      `Les présentes CGU sont régies par le droit malgache. En cas de différend, les parties rechercheront d'abord une solution amiable ; à défaut, le litige sera porté devant les juridictions compétentes d'Antananarivo.`
    ]
  },
  {
    title: '13. Contact',
    body: [
      `Pour toute question relative à l'Application ou aux présentes CGU : ${APP_INFO.creatorEmail} · ${APP_INFO.creatorPhone}.`
    ]
  }
];

/** The terms, ready to display. */
export const CguContent: React.FC<{ compact?: boolean }> = ({ compact }) => (
  <div className={compact ? 'space-y-4' : 'space-y-6'}>
    <p className="text-xs text-slate-500">Dernière mise à jour : {APP_INFO.cguUpdatedOn}</p>
    {CGU_SECTIONS.map((s) => (
      <section key={s.title}>
        <h3 className={`font-headline font-bold text-[#0F172A] ${compact ? 'text-sm' : 'text-base'}`}>{s.title}</h3>
        {s.body.map((p, i) => (
          <p key={i} className="mt-1.5 text-sm text-slate-700 leading-relaxed">{p}</p>
        ))}
      </section>
    ))}
  </div>
);
