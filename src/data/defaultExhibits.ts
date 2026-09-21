import { Exhibit, SiteZone } from '../types';

export const SITE_ZONES: SiteZone[] = [
  {
    id: 'sanctuary_central',
    name: 'Merkez Agora ve Kutsal Ocak',
    center: [0, 0],
    radius: 12,
    description: 'Dorik sütun dizileriyle çevrili anıtsal taş avlu.',
  },
  {
    id: 'north_colonnade',
    name: 'Kuzey Heykeller Stoası',
    center: [0, -18],
    radius: 10,
    description: 'Klasik başyapıt heykellerine ayrılmış gölgeli mermer gezinti yolu.',
  },
  {
    id: 'east_terrace',
    name: 'Doğu Terası ve Fresk Salonu',
    center: [18, 0],
    radius: 10,
    description: 'Antik Akdeniz havzasına bakan güneşli arkeolojik teras.',
  },
  {
    id: 'west_temple',
    name: 'Batı Kalıntılar Tapınağı',
    center: [-18, 0],
    radius: 10,
    description: 'Arkaik metalurji ve yazıtlı tabletlerin sergilendiği iç kutsal alan.',
  },
  {
    id: 'south_amphitheatre',
    name: 'Güney Propylaea Girişi',
    center: [0, 18],
    radius: 10,
    description: 'Antik zeytin ağaçlarıyla çevrili görkemli anıtsal giriş kapısı.',
  },
];

export const DEFAULT_EXHIBITS: Exhibit[] = [];

