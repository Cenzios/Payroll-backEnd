const prisma = require('../src/config/db');
const { createCompany } = require('../src/services/company.service');
const { createEmployee } = require('../src/services/employee.service');
const { calculateAndSaveSalary } = require('../src/services/salary.service');
const { addAddon } = require('../src/services/subscription.service');
const { EMPLOYEE_EPF_PERCENTAGE } = require('../src/constants/payroll.constants');

async function main() {
    try {
        console.log('Starting Verification...');

        // 1. Setup User and Subscription
        const user = await prisma.user.create({
            data: {
                email: `test_${Date.now()}@example.com`,
                password: 'password123',
                role: 'ADMIN',
            }
        });

        const plan = await prisma.plan.create({
            data: {
                name: 'Test Plan',
                price: 100,
                maxEmployees: 1, // Limit 1 for testing
                maxCompanies: 1,
                features: {},
            }
        });

        const subscription = await prisma.subscription.create({
            data: {
                userId: user.id,
                planId: plan.id,
                status: 'ACTIVE',
                startDate: new Date(),
                endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
            }
        });

        console.log('User and Subscription created.');

        // 2. Create Company
        const company = await createCompany(user.id, {
            name: 'Test Company',
            registrationNumber: `REG_${Date.now()}`,
            address: '123 Street',
            contactNumber: '0771234567',
            // Deprecated fields should be ignored
            employeeEPFPercentage: 20,
        });

        console.log('Company created:', company.id);

        // 3. Create Employee 1 (Should succeed)
        const employee1 = await createEmployee(user.id, company.id, {
            fullName: 'John Doe',
            address: '456 Lane',
            nic: `NIC_${Date.now()}_1`,
            employeeId: 'EMP001',
            contactNumber: '0771111111',
            joinedDate: new Date(),
            designation: 'Manager',
            department: 'IT',
            dailyRate: 1000,
            // Deprecated fields should be ignored
            otRate: 500,
        });

        console.log('Employee 1 created:', employee1.id);

        // 4. Create Employee 2 (Should fail due to limit 1)
        try {
            await createEmployee(user.id, company.id, {
                fullName: 'Jane Doe',
                address: '789 Road',
                nic: `NIC_${Date.now()}_2`,
                employeeId: 'EMP002',
                contactNumber: '0772222222',
                joinedDate: new Date(),
                designation: 'Assistant',
                department: 'HR',
                dailyRate: 800,
            });
            console.error('❌ Employee 2 creation should have failed!');
        } catch (error) {
            console.log('✅ Employee 2 creation failed as expected:', error.message);
        }

        // 5. Add Addon (+5 employees)
        await addAddon(user.id, { type: 'EMPLOYEE_EXTRA', value: 5 });
        console.log('Addon added.');

        // 6. Create Employee 2 again (Should succeed now)
        const employee2 = await createEmployee(user.id, company.id, {
            fullName: 'Jane Doe',
            address: '789 Road',
            nic: `NIC_${Date.now()}_2`,
            employeeId: 'EMP002',
            contactNumber: '0772222222',
            joinedDate: new Date(),
            designation: 'Assistant',
            department: 'HR',
            dailyRate: 800,
        });

        console.log('Employee 2 created successfully after addon:', employee2.id);

        // 7. Calculate Salary
        // Basic = 1000 * 20 = 20000
        // Employee EPF = 20000 * 8% = 1600
        // Net = 20000 - 1600 = 18400 (NO BONUS)
        const salary = await calculateAndSaveSalary(company.id, {
            employeeId: employee1.id,
            month: 1,
            year: 2025,
            workingDays: 20,
        });

        console.log('Salary calculated:', salary);

        // Verify Calculation
        const expectedBasic = 1000 * 20;
        const expectedEPF = (expectedBasic * 8) / 100;
        // Corrected logic: Net = Basic - EPF (NO BONUS)
        const expectedNet = expectedBasic - expectedEPF;

        if (salary.basicPay === expectedBasic && salary.employeeEPF === expectedEPF && salary.netSalary === expectedNet) {
            console.log('✅ Salary calculation correct.');
        } else {
            console.error('❌ Salary calculation incorrect.');
            console.log('Expected Basic:', expectedBasic, 'Got:', salary.basicPay);
            console.log('Expected EPF:', expectedEPF, 'Got:', salary.employeeEPF);
            console.log('Expected Net:', expectedNet, 'Got:', salary.netSalary);
        }

    } catch (error) {
        console.error('Verification failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
