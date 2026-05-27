import { db } from './index'
import { topics, sources } from './schema'

async function seed() {
  console.log('Seeding ai-adoption topic...')

  await db.insert(topics).values({
    id: 'ai-adoption',
    name: 'AI Adoption',
    description: 'Research into how organisations are adopting AI tools and practices',
    lookbackDays: 30,
    hypotheses: [],
    status: 'active',
  }).onConflictDoNothing()

  const sourceData = [
    { slug: 'lennys-newsletter',      name: "Lenny's Newsletter",           feedUrl: 'https://www.lennysnewsletter.com/feed', perspective: 'product',       tier: '1', accessType: 'free+paid' },
    { slug: 'pragmatic-engineer',     name: 'The Pragmatic Engineer',       feedUrl: 'https://newsletter.pragmaticengineer.com/feed', perspective: 'practitioner', tier: '1', accessType: 'free+paid' },
    { slug: 'engineering-leadership', name: 'Engineering Leadership',       feedUrl: 'https://newsletter.canopy.is/feed',     perspective: 'leadership',    tier: '1', accessType: 'free' },
    { slug: 'the-beautiful-mess',     name: 'The Beautiful Mess',           feedUrl: 'https://cutlefish.substack.com/feed',   perspective: 'leadership',    tier: '1', accessType: 'free' },
    { slug: 'dev-interrupted',        name: 'Dev Interrupted',              feedUrl: 'https://linearb.io/blog/feed',          perspective: 'practitioner',  tier: '2', accessType: 'free' },
    { slug: 'the-engineering-manager',name: 'The Engineering Manager',      feedUrl: 'https://theengineeringmanager.substack.com/feed', perspective: 'leadership', tier: '2', accessType: 'free' },
    { slug: 'one-useful-thing',       name: 'One Useful Thing',             feedUrl: 'https://www.oneusefulthing.org/feed',   perspective: 'research',      tier: '1', accessType: 'free' },
    { slug: 'leaddev',                name: 'LeadDev',                      feedUrl: 'https://leaddev.com/feed',              perspective: 'practitioner',  tier: '2', accessType: 'free' },
    { slug: 'martinfowler',           name: 'Martin Fowler',                feedUrl: 'https://martinfowler.com/feed.atom',    perspective: 'research',      tier: '1', accessType: 'free' },
  ] as const

  for (const s of sourceData) {
    await db.insert(sources).values({
      id: s.slug,
      topicId: 'ai-adoption',
      name: s.name,
      slug: s.slug,
      feedUrl: s.feedUrl,
      perspective: s.perspective,
      tier: s.tier,
      accessType: s.accessType,
      status: 'active',
    }).onConflictDoNothing()
  }

  console.log(`Seeded 1 topic, ${sourceData.length} sources.`)
  process.exit(0)
}

seed().catch(err => {
  console.error(err)
  process.exit(1)
})
