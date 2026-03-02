/**
 * AI Cliometrics - Expert Panel Data
 * Canonical works with AI baselines and publication links
 */

// API Configuration
// const API_BASE = 'http://localhost:5000/api';  // Local development
// For production use:
const API_BASE = 'https://ai-cliometrics-api.onrender.com/api';

// The 8 Explanatory Factors
const FACTORS = [
    {
        id: 'Institutions',
        name: 'Institutions',
        definition: 'Property rights, financial system, Rule of Law, factor market functioning.'
    },
    {
        id: 'Relative_Wages',
        name: 'Relative Wages',
        definition: 'Wage/capital ratio, wage/energy ratio, price incentives for mechanization (Allen).'
    },
    {
        id: 'Coal_Energy',
        name: 'Coal and Energy',
        definition: 'Geological availability, extraction cost, access to fossil fuels.'
    },
    {
        id: 'Empire_Resources',
        name: 'Empire and Resources',
        definition: 'Colonial trade, slavery, "ghost acreage", global resource transfers (Pomeranz).'
    },
    {
        id: 'Knowledge_Culture',
        name: 'Knowledge',
        definition: 'Industrial Enlightenment, "Republic of Letters", culture of invention (Mokyr).'
    },
    {
        id: 'Demography',
        name: 'Demography',
        definition: 'Marriage patterns, fertility rates, rural-urban migration.'
    },
    {
        id: 'Geography',
        name: 'Geography',
        definition: 'Non-energy natural endowments, coastlines, navigable rivers, climate.'
    },
    {
        id: 'Other',
        name: 'Other / Contingency',
        definition: 'Political events, wars, chance, non-epistemic cultural factors.'
    }
];

// The 15 Canonical Works with AI baseline values and publication links
const WORKS = {
    'Allen_2009': {
        author: 'Robert C. Allen (2009)',
        title: 'The British Industrial Revolution in Global Perspective',
        type: 'Materialist',
        url: 'https://doi.org/10.1017/CBO9780511816680',
        aiBaseline: {
            Institutions: 20,
            Relative_Wages: 30,
            Coal_Energy: 20,
            Empire_Resources: 10,
            Knowledge_Culture: 15,
            Demography: 0,
            Geography: 5,
            Other: 0
        }
    },
    'Wrigley_2010': {
        author: 'E. A. Wrigley (2010)',
        title: 'Energy and the English Industrial Revolution',
        type: 'Materialist',
        url: 'https://doi.org/10.1017/CBO9780511779619',
        aiBaseline: {
            Institutions: 15,
            Relative_Wages: 10,
            Coal_Energy: 40,
            Empire_Resources: 5,
            Knowledge_Culture: 10,
            Demography: 10,
            Geography: 10,
            Other: 0
        }
    },
    'Broadberry_2015': {
        author: 'Stephen Broadberry et al. (2015)',
        title: 'British Economic Growth, 1270–1870',
        type: 'Cliometric',
        url: 'https://doi.org/10.1017/CBO9781107707603',
        aiBaseline: {
            Institutions: 30,
            Relative_Wages: 20,
            Coal_Energy: 10,
            Empire_Resources: 10,
            Knowledge_Culture: 10,
            Demography: 10,
            Geography: 5,
            Other: 5
        }
    },
    'Pomeranz_2000': {
        author: 'Kenneth Pomeranz (2000)',
        title: 'The Great Divergence',
        type: 'Global',
        url: 'https://doi.org/10.1515/9781400823499',
        aiBaseline: {
            Institutions: 25,
            Relative_Wages: 10,
            Coal_Energy: 15,
            Empire_Resources: 20,
            Knowledge_Culture: 15,
            Demography: 5,
            Geography: 10,
            Other: 0
        }
    },
    'Inikori_2002': {
        author: 'Joseph Inikori (2002)',
        title: 'Africans and the Industrial Revolution in England',
        type: 'Global',
        url: 'https://doi.org/10.1017/CBO9780511583940',
        aiBaseline: {
            Institutions: 20,
            Relative_Wages: 10,
            Coal_Energy: 5,
            Empire_Resources: 40,
            Knowledge_Culture: 10,
            Demography: 5,
            Geography: 5,
            Other: 5
        }
    },
    'Beckert_2014': {
        author: 'Sven Beckert (2014)',
        title: 'Empire of Cotton: A Global History',
        type: 'Global',
        url: 'https://www.penguinrandomhouse.com/books/227973/empire-of-cotton-by-sven-beckert/',
        aiBaseline: {
            Institutions: 30,
            Relative_Wages: 5,
            Coal_Energy: 5,
            Empire_Resources: 35,
            Knowledge_Culture: 10,
            Demography: 5,
            Geography: 5,
            Other: 5
        }
    },
    'Parthasarathi_2011': {
        author: 'Prasannan Parthasarathi (2011)',
        title: 'Why Europe Grew Rich and Asia Did Not',
        type: 'Global',
        url: 'https://doi.org/10.1017/CBO9780511993398',
        aiBaseline: {
            Institutions: 20,
            Relative_Wages: 10,
            Coal_Energy: 10,
            Empire_Resources: 25,
            Knowledge_Culture: 10,
            Demography: 5,
            Geography: 10,
            Other: 10
        }
    },
    'North_1989': {
        author: 'Douglass North & Barry Weingast (1989)',
        title: 'Constitutions and Commitment',
        type: 'Institutional',
        url: 'https://doi.org/10.1017/S0022050700009451',
        aiBaseline: {
            Institutions: 70,
            Relative_Wages: 5,
            Coal_Energy: 0,
            Empire_Resources: 5,
            Knowledge_Culture: 10,
            Demography: 0,
            Geography: 0,
            Other: 10
        }
    },
    'Acemoglu_2012': {
        author: 'Daron Acemoglu & James Robinson (2012)',
        title: 'Why Nations Fail',
        type: 'Institutional',
        url: 'https://doi.org/10.1257/aer.102.6.3077',
        aiBaseline: {
            Institutions: 80,
            Relative_Wages: 5,
            Coal_Energy: 0,
            Empire_Resources: 5,
            Knowledge_Culture: 5,
            Demography: 0,
            Geography: 5,
            Other: 0
        }
    },
    'Crafts_1992': {
        author: 'Nicholas Crafts & C. Knick Harley (1992)',
        title: 'Output Growth and the British Industrial Revolution',
        type: 'Cliometric',
        url: 'https://doi.org/10.1111/j.1468-0289.1992.tb01344.x',
        aiBaseline: {
            Institutions: 30,
            Relative_Wages: 10,
            Coal_Energy: 10,
            Empire_Resources: 5,
            Knowledge_Culture: 15,
            Demography: 15,
            Geography: 5,
            Other: 10
        }
    },
    'Landes_1969': {
        author: 'David S. Landes (1969)',
        title: 'The Unbound Prometheus',
        type: 'Cultural',
        url: 'https://doi.org/10.1017/CBO9780511819858',
        aiBaseline: {
            Institutions: 10,
            Relative_Wages: 5,
            Coal_Energy: 10,
            Empire_Resources: 5,
            Knowledge_Culture: 50,
            Demography: 5,
            Geography: 5,
            Other: 10
        }
    },
    'Mokyr_2016': {
        author: 'Joel Mokyr (2016)',
        title: 'A Culture of Growth',
        type: 'Cultural',
        url: 'https://doi.org/10.1515/9781400851096',
        aiBaseline: {
            Institutions: 20,
            Relative_Wages: 5,
            Coal_Energy: 5,
            Empire_Resources: 5,
            Knowledge_Culture: 55,
            Demography: 5,
            Geography: 5,
            Other: 0
        }
    },
    'DeVries_2008': {
        author: 'Jan de Vries (2008)',
        title: 'The Industrious Revolution',
        type: 'Demographic',
        url: 'https://doi.org/10.1017/CBO9780511818196',
        aiBaseline: {
            Institutions: 20,
            Relative_Wages: 15,
            Coal_Energy: 5,
            Empire_Resources: 10,
            Knowledge_Culture: 10,
            Demography: 30,
            Geography: 5,
            Other: 5
        }
    },
    'Clark_2007': {
        author: 'Gregory Clark (2007)',
        title: 'A Farewell to Alms',
        type: 'Cultural',
        url: 'https://doi.org/10.1515/9781400831234',
        aiBaseline: {
            Institutions: 10,
            Relative_Wages: 10,
            Coal_Energy: 5,
            Empire_Resources: 5,
            Knowledge_Culture: 30,
            Demography: 20,
            Geography: 5,
            Other: 15
        }
    },
    'Voigtlander_2006': {
        author: 'Nico Voigtländer & Hans-Joachim Voth (2006)',
        title: 'Why England? Demographic Factors, Structural Change and Physical Capital',
        type: 'Demographic',
        url: 'https://doi.org/10.1016/j.jmoneco.2006.02.003',
        aiBaseline: {
            Institutions: 10,
            Relative_Wages: 10,
            Coal_Energy: 5,
            Empire_Resources: 5,
            Knowledge_Culture: 10,
            Demography: 50,
            Geography: 5,
            Other: 5
        }
    }
};

// Export for use in app.js
window.FACTORS = FACTORS;
window.WORKS = WORKS;
window.API_BASE = API_BASE;
