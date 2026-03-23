import "dotenv/config";
import neo4j from "neo4j-driver";

const uri = process.env.NEO4J_URI;
const user = process.env.NEO4J_USER;
const password = process.env.NEO4J_PASSWORD;
const database = process.env.NEO4J_DATABASE;

if (!uri || !user || !password) {
  console.error("Missing NEO4J_URI, NEO4J_USER, or NEO4J_PASSWORD in environment.");
  process.exit(1);
}

const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

const seedCypher = `
MERGE (root:Category {name: 'Artificial Intelligence'})

MERGE (ml:Category {name: 'Machine Learning'})
MERGE (python:Category {name: 'Python'})
MERGE (dl:Category {name: 'Deep Learning'})

MERGE (root)-[:HAS_SUBCATEGORY]->(ml)
MERGE (root)-[:HAS_SUBCATEGORY]->(python)
MERGE (root)-[:HAS_SUBCATEGORY]->(dl)

MERGE (lr:Course {name: 'Linear Regression'})
  SET lr.description = 'Learn regression basics and model fitting techniques.',
      lr.difficulty = 'Beginner',
      lr.duration = '4 hours'
MERGE (dt:Course {name: 'Decision Trees'})
  SET dt.description = 'Understand tree-based models and classification workflows.',
      dt.difficulty = 'Beginner',
      dt.duration = '5 hours'
MERGE (basics:Course {name: 'Basics'})
  SET basics.description = 'Python fundamentals for AI and data workflows.',
      basics.difficulty = 'Beginner',
      basics.duration = '6 hours'
MERGE (numpy:Course {name: 'NumPy'})
  SET numpy.description = 'Numerical programming essentials using NumPy.',
      numpy.difficulty = 'Intermediate',
      numpy.duration = '4 hours'
MERGE (nn:Course {name: 'Neural Networks'})
  SET nn.description = 'Core neural network concepts and practical intuition.',
      nn.difficulty = 'Intermediate',
      nn.duration = '7 hours'

MERGE (ml)-[:HAS_COURSE]->(lr)
MERGE (ml)-[:HAS_COURSE]->(dt)
MERGE (python)-[:HAS_COURSE]->(basics)
MERGE (python)-[:HAS_COURSE]->(numpy)
MERGE (dl)-[:HAS_COURSE]->(nn)
`;

async function seed() {
  const session = database ? driver.session({ database }) : driver.session();

  try {
    await driver.verifyConnectivity();
    await session.run(seedCypher);
    console.log("Neo4j seed completed successfully.");
  } catch (error) {
    console.error("Neo4j seed failed:", error.message);
    if (error.message.includes("Database does not exist")) {
      console.error("Set NEO4J_DATABASE in backend/.env to your actual database name, then rerun npm run seed:neo4j");
    }
    process.exitCode = 1;
  } finally {
    await session.close();
    await driver.close();
  }
}

seed();
