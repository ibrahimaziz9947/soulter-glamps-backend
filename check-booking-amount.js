import prisma from './src/config/prisma.js';

const booking = await prisma.booking.findFirst({ 
  select: { 
    id: true, 
    totalAmount: true, 
    customerName: true 
  } 
});

console.log('Sample Booking:', booking);
if (booking) {
  console.log('totalAmount:', booking.totalAmount, 'cents =', (booking.totalAmount / 100).toFixed(2), 'PKR');
}

await prisma.$disconnect();
