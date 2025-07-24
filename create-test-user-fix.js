const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestUser() {
    try {
        console.log('🔍 Checking for existing test user...');

        // Check if test user already exists by ID
        let user = await prisma.user.findFirst({
            where: { id: 'test-user-id' }
        });

        if (!user) {
            // Check if user exists by email/provider
            user = await prisma.user.findFirst({
                where: {
                    email: 'test@example.com',
                    providerName: 'LOCAL'
                }
            });

            if (user) {
                console.log('📝 Updating existing user to use test-user-id...');
                // Update existing user to have our test ID
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        id: 'test-user-id',
                        lastReadNotifications: new Date(),
                        timezone: 0,
                    }
                });
            } else {
                console.log('👤 Creating new test user...');
                // Create test user
                user = await prisma.user.create({
                    data: {
                        id: 'test-user-id',
                        email: 'test@example.com',
                        name: 'Test User',
                        password: 'hashed-password',
                        activated: true,
                        providerName: 'LOCAL',
                        lastReadNotifications: new Date(),
                        timezone: 0, // UTC timezone
                    }
                });
            }
        } else {
            console.log('✅ Test user already exists with correct ID');
        }

        console.log('🏢 Checking for test organization...');

        // Check if test org exists
        let existingOrg = await prisma.organization.findFirst({
            where: { id: 'test-org-id' }
        });

        if (!existingOrg) {
            console.log('🏗️ Creating test organization...');

            // Create test organization
            existingOrg = await prisma.organization.create({
                data: {
                    id: 'test-org-id',
                    name: 'Test Organization',
                }
            });
        }

        console.log('🔗 Checking user-organization link...');

        // Check if user is already linked to organization
        const existingLink = await prisma.userOrganization.findFirst({
            where: {
                userId: user.id,
                organizationId: 'test-org-id'
            }
        });

        if (!existingLink) {
            console.log('🔗 Linking user to organization...');

            // Link user to organization
            await prisma.userOrganization.create({
                data: {
                    userId: user.id,
                    organizationId: 'test-org-id',
                    role: 'ADMIN',
                }
            });
        } else {
            console.log('✅ User already linked to organization');
        }

        console.log('✅ Test user and organization created successfully');
    } catch (error) {
        console.error('❌ Error creating test user:', error.message);
        if (error.code === 'P2002') {
            console.log('💡 User might already exist with that email/ID');
        }
    } finally {
        await prisma.$disconnect();
    }
}

createTestUser();
