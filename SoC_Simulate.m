function output_est=SoC_Simulate(x1, x2, x3, x4)

input_temp_tran=[x1;x2;x3;x4];
load('RBF_net')

output_est=sim(net, input_temp_tran);

end
