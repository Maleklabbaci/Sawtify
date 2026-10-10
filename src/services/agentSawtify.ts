export type AgentLanguage = 'fr' | 'ar' | 'both';
export type AgentOrderStatus = 'new' | 'confirmed' | 'delivered';

export interface AgentProduct {
  id: string;
  name: string;
  category: string;
  description: string;
  priceDzd: number;
  stock: number;
  sizes: string[];
  active: boolean;
}

export interface AgentFAQ {
  id: string;
  question: string;
  answer: string;
  active: boolean;
}

export interface AgentOrder {
  id: string;
  createdAt: string;
  customerName: string;
  phone: string;
  wilaya: string;
  productId: string;
  productName: string;
  size: string;
  quantity: number;
  amountDzd: number;
  status: AgentOrderStatus;
}

export interface AgentStore {
  name: string;
  slug: string;
  category: string;
  phone: string;
  location: string;
  greeting: string;
  language: AgentLanguage;
  agentVoiceId: string;
  isActive: boolean;
  products: AgentProduct[];
  faqs: AgentFAQ[];
  orders: AgentOrder[];
}

const STORAGE_KEY = 'sawtify-agent-sawtify-demo-v1';

export const DEMO_AGENT_STORE: AgentStore = {
  name: 'Atelier Amine',
  slug: 'atelier-amine',
  category: 'Mode & sneakers',
  phone: '0550 00 00 00',
  location: 'Alger',
  greeting: 'Salam ! Bienvenue chez Atelier Amine. Je peux vous aider pour les modèles, les tailles, les prix ou la livraison. Vous préférez parler en français ou en darija ?',
  language: 'both',
  agentVoiceId: 'voice_amin',
  isActive: true,
  products: [
    { id: 'p-sneakers-atlas', name: 'Sneakers Atlas', category: 'Chaussures', description: 'Sneakers légères, confortables au quotidien.', priceDzd: 8500, stock: 12, sizes: ['39', '40', '41', '42', '43'], active: true },
    { id: 'p-sac-riva', name: 'Sac Riva', category: 'Accessoires', description: 'Sac compact avec bandoulière réglable.', priceDzd: 4200, stock: 8, sizes: ['Unique'], active: true },
    { id: 'p-casquette-north', name: 'Casquette North', category: 'Accessoires', description: 'Casquette légère, plusieurs coloris disponibles.', priceDzd: 1800, stock: 0, sizes: ['Unique'], active: true },
  ],
  faqs: [
    { id: 'faq-delivery', question: 'Livrez-vous dans toutes les wilayas ?', answer: 'Oui, nous livrons dans les 58 wilayas. Le paiement se fait à la livraison.', active: true },
    { id: 'faq-time', question: 'Quels sont les délais de livraison ?', answer: 'La livraison prend généralement entre 24 et 72 heures, selon votre wilaya.', active: true },
    { id: 'faq-return', question: 'Est-ce que je peux échanger un article ?', answer: 'Oui, vous avez 48 heures après réception pour demander un échange si la taille ne convient pas.', active: true },
  ],
  orders: [
    { id: 'cmd-demo-1', createdAt: new Date(Date.now() - 1000 * 60 * 38).toISOString(), customerName: 'Yasmine B.', phone: '0550 00 00 00', wilaya: 'Oran', productId: 'p-sneakers-atlas', productName: 'Sneakers Atlas', size: '39', quantity: 1, amountDzd: 8500, status: 'new' },
    { id: 'cmd-demo-2', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), customerName: 'Nassim K.', phone: '0550 00 00 00', wilaya: 'Blida', productId: 'p-sac-riva', productName: 'Sac Riva', size: 'Unique', quantity: 1, amountDzd: 4200, status: 'confirmed' },
    { id: 'cmd-demo-3', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), customerName: 'Lina M.', phone: '0550 00 00 00', wilaya: 'Alger', productId: 'p-sneakers-atlas', productName: 'Sneakers Atlas', size: '41', quantity: 1, amountDzd: 8500, status: 'delivered' },
  ],
};

export function createDemoAgentStore(): AgentStore {
  return JSON.parse(JSON.stringify(DEMO_AGENT_STORE)) as AgentStore;
}

type PersistedAgentStore = Omit<AgentStore, 'agentVoiceId'> & Partial<Pick<AgentStore, 'agentVoiceId'>>;

function isAgentStore(value: unknown): value is PersistedAgentStore {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<AgentStore>;
  return typeof candidate.name === 'string'
    && typeof candidate.slug === 'string'
    && typeof candidate.category === 'string'
    && typeof candidate.phone === 'string'
    && typeof candidate.location === 'string'
    && typeof candidate.greeting === 'string'
    && (candidate.language === 'fr' || candidate.language === 'ar' || candidate.language === 'both')
    && typeof candidate.isActive === 'boolean'
    && Array.isArray(candidate.products)
    && Array.isArray(candidate.faqs)
    && Array.isArray(candidate.orders);
}

export function readAgentStore(): AgentStore {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed: unknown = JSON.parse(saved);
      if (isAgentStore(parsed)) {
        return {
          ...createDemoAgentStore(),
          ...parsed,
          agentVoiceId: parsed.agentVoiceId?.trim() || DEMO_AGENT_STORE.agentVoiceId,
        };
      }
    }
  } catch {
    // Le mode aperçu reste utilisable si le stockage local est désactivé.
  }
  return createDemoAgentStore();
}

export function saveAgentStore(store: AgentStore): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Un stockage désactivé ne doit pas bloquer la démonstration.
  }
}

export function getCallLink(slug: string, origin = window.location.origin): string {
  const safeSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'ma-boutique';
  return `${origin.replace(/\/$/, '')}/call/${encodeURIComponent(safeSlug)}`;
}

export function makeAgentId(prefix: string): string {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return `${prefix}-${random}`;
}

/** Parse CSV exported from a spreadsheet. Recognized columns: name, price, stock, sizes, category, description. */
export function parseProductCsv(csv: string): AgentProduct[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const firstLine = csv.split(/\r?\n/, 1)[0] || '';
  const delimiter = (firstLine.match(/;/g)?.length || 0) > (firstLine.match(/,/g)?.length || 0) ? ';' : ',';

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    if (char === '"') {
      if (quoted && csv[index + 1] === '"') { cell += '"'; index += 1; }
      else quoted = !quoted;
    } else if (!quoted && char === delimiter) {
      row.push(cell.trim()); cell = '';
    } else if (!quoted && (char === '\n' || char === '\r')) {
      if (char === '\r' && csv[index + 1] === '\n') index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = []; cell = '';
    } else {
      cell += char;
    }
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  if (rows.length < 2) return [];

  const normalize = (value: string) => value.toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const headers = rows[0].map(normalize);
  const indexFor = (names: string[], fallback: number) => {
    const found = headers.findIndex((header) => names.includes(header));
    return found >= 0 ? found : fallback;
  };
  const nameIndex = indexFor(['name', 'nom', 'produit', 'product'], 0);
  const priceIndex = indexFor(['price', 'prix', 'pricedzd', 'prixdzd'], 1);
  const stockIndex = indexFor(['stock', 'quantite', 'quantite en stock'], 2);
  const sizesIndex = indexFor(['sizes', 'tailles', 'taille'], 3);
  const categoryIndex = indexFor(['category', 'categorie', 'catégorie'], 4);
  const descriptionIndex = indexFor(['description', 'details', 'detail'], 5);
  const get = (cells: string[], index: number) => cells[index] || '';

  return rows.slice(1).flatMap((cells) => {
    const name = get(cells, nameIndex).trim();
    const priceDzd = Number(get(cells, priceIndex).replace(/[\s.]/g, '').replace(',', '.'));
    const stock = Number(get(cells, stockIndex).replace(/\s/g, ''));
    if (!name || !Number.isFinite(priceDzd) || priceDzd < 0) return [];
    const sizes = get(cells, sizesIndex).split(/[|;,]/).map((size) => size.trim()).filter(Boolean);
    return [{
      id: makeAgentId('p'),
      name,
      category: get(cells, categoryIndex).trim() || 'Autre',
      description: get(cells, descriptionIndex).trim(),
      priceDzd,
      stock: Number.isFinite(stock) && stock >= 0 ? stock : 0,
      sizes,
      active: true,
    }];
  });
}
